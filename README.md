# qmcu-rule-manager

##What it does
The Rule Manager allows a Qlik Sense administrator to export and import security rules from and to the Qlik Sense repository.  It enables rules to become transportable between Qlik Sense sites.


##How it Works
Opening the Security Rules Manager plugin displays a list of all the security rules on the site QMC Utilities is connected to.

![1](https://s3.amazonaws.com/eapowertools/qmcutilities/RuleManager.png)

###Exporting Rules
To export rules, click the selected check box to the left of each rule to export.  Once all the desired rules are selected, click the Export button at the bottom of the page.  

The Security Rules Manager will export the security rules to a json file and prompt for download.

###Importing Rules
To Import rules, click the Import Rules button.  A dialog box will appear that has a file selector and the ability to drag and drop a rules json file onto the dialog.  Once selected, clicking the Done button will present the rules to import.

![2](https://s3.amazonaws.com/eapowertools/qmcutilities/importRuleFile.png)

The Importable Rules window appears with a list of rules from the json file.  Select the rules to import and click the import button.

![3](https://s3.amazonaws.com/eapowertools/qmcutilities/uploadedRuleFile.png)

When importing rules if the rule already exists on the destination Qlik Sense site, the rule will be updated.  If the rule does not exist, it will be added.  In the event the rule to be added has been previously deleted, the ID for the rule on the destination Qlik Sense site will changed to a different value.
