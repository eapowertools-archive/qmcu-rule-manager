var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({extended: false});
var fs = require('fs');
var path = require('path');
var readLine = require('readline');
var qrsInteract = require('qrs-interact');
var config = require('./config');
var multer = require('multer');
var autoReap = require('multer-autoreap');
var promise = require('bluebird');


var qrsConfig = {
    hostname: config.qrs.hostname,
    localCertPath: config.qrs.localCertPath
}

var qrs = new qrsInteract(qrsConfig);

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: true}));
router.use('/data', express.static(config.thisServer.pluginPath + "/rulemanager/data"));
router.use('/output', express.static(config.thisServer.pluginPath + "/rulemanager/output"));
router.use(autoReap);
autoReap.options.reapOnError= true;

var destDir = path.join(config.thisServer.pluginPath, "rulemanager/uploads/");
var upload = multer({ dest: destDir});


router.route('/getRules')
    .get(function(request,response)
    {
        //first get the table file;
        var tableDef = fs.readFileSync(config.thisServer.pluginPath + "/rulemanager/data/tableDef.json");

        var filter = "((category+eq+%27Security%27))";

        qrs.Post("systemrule/table?filter=" + filter + "&orderAscending=true&skip=0&sortColumn=name", JSON.parse(tableDef),"json")
        .then(function(result)
        {
            var s = JSON.stringify(result.body);
            response.send(s);
        })
        .catch(function(error)
        {
            response.send(error);
        });

    });

router.route('/exportRules')
    .post(parseUrlencoded, function(request, response)
    {
        var res = response;
        console.log(request.body);
        var selectionBody = createSelection(request.body);
        var selectionId = "";
        var message = {};
        qrs.Post('selection', selectionBody,"json")
        .then(function(result)
        {
            console.log('selectionid: ' + result.body.id);
            selectionId = result.body.id;
            return qrs.Get('selection/' + selectionId + '/systemrule/full')
            .then(function(result)
            {
                message.success=true;
                message.items= result.body;
                return qrs.Delete('selection/' + selectionId)
                .then(function()
                {
                    console.log('selection deleted');
                    //time to create the file and download it.
                    var file = config.thisServer.pluginPath + '/rulemanager/output/rules.json';
                    var destFile = fs.createWriteStream(file);
                    destFile.on('finish', function()
                    {
                        console.log('File done, downloading');
                        console.log(file);
                        response.setHeader('Content-disposition', 'attachment; filename=rules.json');
                        response.setHeader('Content-type', 'application/json');
                        return response.download(file, 'rules.json', function(error)
                        {
                            if(!error)
                            {
                                console.log('yay team');
                            }
                        });
                    });
                    
                    destFile.write(JSON.stringify(message.items));
                    destFile.end();
                });
            });
        })
        .catch(function(error)
        {
            message.success = false;
            console.log(error);
            res.json(message);
        });
    });

router.route('/importRules')
    .post(parseUrlencoded, function(request, response)
    {
        return promise.map(request.body, function(rule) {
            var localId = rule.id;
            return qrs.Get('systemrule/full?filter=id eq ' + rule.id + " or name eq '" + rule.name + "'")
            .then(function (result) {
                    var localResult = result.body;
                    if (localResult.length == 0) {
                        var systemRuleToAdd = rule;
                        delete systemRuleToAdd.createdDate;
                        delete systemRuleToAdd.modifiedByUserName;
                        delete systemRuleToAdd.modifiedDate;
                        return qrs.Post(
                            'systemrule',
                            rule,
                            'json'
                        ).then(function (postResponse, reject) {
                            return {"id":localId, "state":"Added"};
                        }).catch(function(error) {
                            return {"id":localId, "state":"Failed. " + error};
                        });
                    } else if (localResult.length == 1) {
                        var systemRuleToUpdate = rule;
                        systemRuleToUpdate.id = localResult[0].id;
                        systemRuleToUpdate.createdDate = localResult[0].createdDate;
                        systemRuleToUpdate.modifiedByUserName = localResult[0].modifiedByUserName;
                        systemRuleToUpdate.modifiedDate = localResult[0].modifiedDate;
                        var existingID = localResult[0].id;
                        return qrs.Put(
                            'systemrule/' + existingID,
                            systemRuleToUpdate
                        ).then(function (putResponse) {
                            return {"id":localId, "state":"Updated"};
                        }).catch(function (reject) {
                            return {"id":localId, "state":"Failed. " + error};
                        });

                    } else {
                        return {"id":localId, "state":"Failed. More than 1 rule found matching this ID or Name."};
                    }
                })
                .catch(function (error) {
                    console.log(error);
                });
        }).then(function (mapResult) {
            response.send(mapResult);
        });
    });

router.post('/uploadRules', upload.array('file', 1) , function (req, res) 
{
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
 //console.log("Iam files");
  console.log(req.files);

  	var fileStream = fs.createReadStream(req.files[0].path);
	var rl = readLine.createInterface({
		input: fileStream,
		terminal:false
	});

    var result ="";


	var propArray =[];
	rl.on('line', function(line){
		result += line;
	});

	rl.on('close', function(){				
		res.on('autoreap', function(reapedFile)
		{
			console.log('reap file: ' + reapedFile);
		});
		res.status(200).json(JSON.parse(result));
	});

});

module.exports = router;


function createSelection(ruleIds)
{
    var array = []
    ruleIds.forEach(function(ruleId)
    {
        var item = {
            type: "SystemRule",
            objectID: ruleId
        };
        array.push(item)
    });

    var result = {items: array};

    return result;
}