#!/usr/bin/env node

/**
 * Script the Clever Cloud CLI with JavaScript
 * Only tested on OSX
 * Probably ok with Linux
 * Some 🚧 to do with window
 */

const cmd = require('../lib/casti.js').cmd

let applicationName = "my_gb_36"
let organization = "wey-yu"
let applicationRegion = "par"

let addonName = "gb_demo_36"
let addonRegion = "eu"

let applicationPath = `${process.cwd()}/${applicationName}`

/**
 * Create FS Bucket to store data and repositories
 */

let addonScriptCreation = `clever addon create fs-bucket "${addonName}" --plan s --org ${organization} --region ${addonRegion}`
cmd({
  script: addonScriptCreation,
  failure: error => console.log("1- 😡 something wrong when creating the addon", error),
  success: out =>  {
    console.log("1- 🙂 addon created")

    /**
     * Provision the application
     */
    //let environmentVariables = ["JAVA_VERSION=8", "GITBUCKET_HOME=/app/storage/.gitbucket", "PORT=8080"]
    //#echo "${environmentVariables.join('\n')}" | clever env import --alias "${applicationName}"

    cmd({
      script: `
        # === create repository ===
        mkdir ${applicationPath}
        cd ${applicationPath}
        clever create "${applicationName}" -t war --org ${organization} --region ${applicationRegion} --alias "${applicationName}"
        clever env set PORT 8080 --alias "${applicationName}"
        clever env set JAVA_VERSION 8 --alias "${applicationName}"
        clever env set GITBUCKET_HOME /app/storage/.gitbucket --alias "${applicationName}"
        clever domain add ${applicationName}.cleverapps.io --alias "${applicationName}"  
        clever scale --flavor M --alias "${applicationName}"
        clever service link-addon ${addonName} --alias "${applicationName}"
      `,
      failure: error => console.log("2- 😡 something wrong when provisioning the application", error),
      success: out => {
        console.log("2a- 😍 Application provisioning ok", out)

        /**
         * Clever Tools create a `.clever.json` with application information
         */
        let config = require(`${applicationPath}/.clever.json`).apps[0]
        let app_id = config.app_id // Clever application Id

        console.log("😀 config:", config)

        console.log("😀 app_id:", app_id)

        /**
         * extract environment variables
         * useful to retrieve the uri of a database for example
         */
        var envvars = null
        cmd({
          script: `
            cd ${applicationPath}
            clever env
          `,
          failure: error => console.log("2b- 😡 something wrong when reading environment variables", error),
          success: res_env => {
            console.log("😜 res_env", res_env)

            let raw_envvars = res_env.split('\n')
            envvars = raw_envvars !== null  
              ? raw_envvars
                .filter(item => (!item.startsWith("#")) && (!item == ""))
                .map(item => {return {name:item.split("=")[0], value:item.split("=")[1]} })
              : null
            console.log("2b- 😍 Environment variables ok", envvars)    
            

            /**
             * extract services (linked applications and addons)
             */
            let services = {}
            cmd({
              script: `
                cd ${applicationPath}
                clever service
              `,
              failure: error => console.log("2c- 😡 something wrong when reading services", error),
              success: res_service => {
                let raw_services = res_service.split('\n').filter(line => line.length > 0)
                let addons = raw_services !== null  
                  ? raw_services.filter(item => raw_services.indexOf(item) > raw_services.indexOf("Addons:"))
                    .map(item => {
                      return {
                        name: item.trim().split(" ")[0],
                        id: item.trim().split("(")[1].split(")")[0]
                      }
                    })
                  : null    
        
                let applications = raw_services !== null  
                  ? raw_services.filter(item => raw_services.indexOf(item) < raw_services.indexOf("Addons:") && raw_services.indexOf(item) > raw_services.indexOf("Applications:"))
                    .map(item => {
                      return {
                        name: item.trim().split(" ")[0],
                        id: item.trim().split("(")[1].split(")")[0]
                      }
                    })
                  : null  
                
                services = {addons, applications}
              
                console.log("2c- 😍 Reading services ok", services)      
                
                /**
                 * Link the bucket
                 */
                let bucketHost = envvars.find(item => item.name == "BUCKET_HOST") 

                console.log("🤖 bucketHost", bucketHost)
                console.log("🤖 applicationPath", applicationPath)
                console.log("🤖 applicationName", applicationName)
                
                
                cmd({
                  script: `
                    cd ${applicationPath}
                    clever env set CC_FS_BUCKET /storage:${bucketHost.value} --alias "${applicationName}"
                  `,
                  failure: error => console.log("2d- 😡 something wrong when adding variable", error),
                  success: out => {
                    console.log("2d- 😍 adding variable ok", out) 
                  }
                })
                

                /**
                 * Now we need to downlad GitBucket
                 */
                let from = "https://github.com/gitbucket/gitbucket/releases/download/4.15.0/gitbucket.war"
                let targetName = "gitbucket.war"
                cmd({
                  script: `
                    # === download and copy gitbucket to the application directory ===
                    curl -L ${from} --output ${applicationPath}/${targetName}     
                  `,
                  failure: error => console.log("3- 😡 something wrong when dowloading the war file", error),
                  success: out => {
                    console.log("3- 🤗 Download is ok", out)

                    /**
                     * create clever configuration file
                     * to define the war file
                     */
                    cmd({
                      script: `
                        # === create clever configuration files ===
                        cd ${applicationPath}
                        mkdir clevercloud
                        cd clevercloud
                        cat > jar.json << EOF
                        {"deploy": {"jarName": "${targetName}"}}
                        EOF
                      `,
                      failure: error => console.log("4- 😡 something wrong when creating the configuration file", error),
                      success: out => {
                        console.log("4- 😉 Creation of the configuration file is ok", out)

                        /**
                         * Create the git repository
                         */
                        cmd({
                          script: `
                            cd ${applicationPath}
                            git init
                            git add .
                            git commit -m "First 🚀 of ${applicationName}"
                            git remote add clever git+ssh://git@push-par-clevercloud-customers.services.clever-cloud.com/${app_id}.git
                          `,
                          failure: error => console.log("5- 😡 something wrong when initialzing the repository", error),
                          success: out => {
                            console.log("5- 🤣 git repository initialized", out)
                    
                            /**
                             * Deploy Application on Clever-Cloud
                             */
                            cmd({
                              script: `
                                cd ${applicationPath}
                                echo "⌛️ wait a little..."
                                git push clever master
                              `,
                              failure: error => console.log("6- 😡 something wrong when deploying the application", error),
                              success: out => {
                                console.log("6- 🍻 project is deploying", out)
                                console.log(`see 🌍 http://${applicationName}.cleverapps.io`)
                              }
                            }) // end of deploy
                          }
                        }) // end of initializing git repository 


                      } // end of succes
                    }) // end of creating the configuration file

                  } // end of success
                }) // end of downloading the war file






              }
            })








          }
        })
   
      } // end of application provisionning success
    }) // end of application provisionning

  } // end of addon success
})
