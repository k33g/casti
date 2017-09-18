# Casti
Script the CLI (Clever tools: https://github.com/CleverCloud/clever-tools)

All started here: https://medium.com/@k33g_org/scripting-clever-tools-with-nodejs-is-more-fun-and-more-efficient-3f55c32e906b

## Recipes

> - You need to install the [Clever tools](https://github.com/CleverCloud/clever-tools)
> - You add to register a ssh key at Clever Cloud (for git push your applications)
> - run a recipe: `./recipes/<recipe_name>.js`


- create and deploy an Express application on Clever Cloud: `./recipes/create-express-app.js`
- create and deploy a MongoDb database on Clever Cloud: `./recipes/create-addon-mongodb.js`
- deploy GitBucket on Clever Cloud: `./recipes/deploy-gitbucket.js`
  - see blog post about this on : https://medium.com/@k33g_org/create-a-devops-platform-with-clever-tools-and-nodejs-part-1-dvcs-2f9e8d0657a9
- a more readable version of deploy GitBucket on Clever Cloud: `./recipes/deploy-gitbucket.async.js`
- ... more to come

## btw

> Casti is a planet of the Votanis System, terraformed by the Indogenes and colonized by the Castithans.
