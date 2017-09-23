const exec = require('child_process').exec;

let cmd = ({script, failure, success}) => {
  var result = null
  let process = exec(script.split("\n").map(item => item.trim()).join("\n"), (error, stdout, stderr) => {})
  process.stderr.on('data', error => result = error)
  process.stdout.on('data', data => result = data)
  process.on('exit', code => code == 0 ? success(result) : failure(result))
}

let log = message => {
  console.log(message)
}

class AddOn {
  constructor({name, type, plan, organization, region})  {
    this.name = name
    this.type = type
    this.plan = plan
    this.organization = organization
    this.region = region
    return this
  }
  static of({name, type, plan, organization, region}) {
    return new AddOn({name, type, plan, organization, region})
  }

  create() {
    log(`⌛️ creating ${this.name} addon`)    
    
    let script = `clever addon create ${this.type} "${this.name}" --plan ${this.plan} --org ${this.organization} --region ${this.region}`
    
    return new Promise((resolve, reject) => {
      cmd({
        script: script,
        failure: error => reject(error),
        success: out => { 
          log(`🙂 creation of ${this.name} addon is ok`)
          resolve(out) 
        }
      })
    })
    
  }

}//AddOn

class Application {
  constructor({name, type, flavor, organization, region, envvars}) {
    this.name = name
    this.type = type
    this.flavor = flavor
    this.organization = organization,
    this.region = region
    this.path = `${process.cwd()}/${this.name}`,
    this.envvars = envvars
    this.id = null
    return this
  }
  static of({name, type, flavor, organization, region, envvars}) {
    return new Application({name, type, flavor, organization, region, envvars})
  }

  create() {
    log(`⌛️ creating ${this.name}`)
    //let addons = this.addons.map(name => `clever service link-addon ${name} --alias "${this.name}" `)

    let script = `
      # === create repository ===
      mkdir ${this.path}
      cd ${this.path}
      clever create "${this.name}" -t ${this.type} --org ${this.organization} --region ${this.region} --alias "${this.name}"
      echo "${this.envvars.join("\n")}" | clever env import --alias "${this.name}"
      clever domain add ${this.name}.cleverapps.io --alias "${this.name}"  
      clever scale --flavor ${this.flavor} --alias "${this.name}"
    ` 
    return new Promise((resolve, reject) => {
      cmd({
        script: script,
        failure: error => reject(error),
        success: out => {
          /**
           * Clever Tools create a `.clever.json` with application information
           */
          log(`🙂 creation of ${this.name} application is ok`)
          let config = require(`${this.path}/.clever.json`).apps[0]
          this.id = config.app_id // Clever application Id
          resolve(out)
        }
      })
    })

  }
 
  linkToAddon({name}) {
    log(`⌛️ link addon ${name} to ${this.name}`)
    return  new Promise((resolve, reject) => {
      cmd({
        script: `
          cd ${this.path}
          clever service link-addon ${name} --alias "${this.name}"
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 addon ${name} is linked`)
          resolve(out)
        }
      })
    })
  }

  setEnvironmentVariable({envvar}) {
    log(`⌛️ set environment variable: ${envvar}`)
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          cd ${this.path}
          clever env set ${envvar.split("=")[0]} ${envvar.split("=")[1]} --alias "${this.name}"
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 environment variable: ${envvar} is ok`)
          resolve(out)
        }
      })
    })
  }

  /**
   * extract environment variables
   * useful to retrieve the uri of a database for example
   */
  getEnvironmentVariables() {
    log(`⌛️ get environment variables`)
    return new Promise((resolve, reject) => {
      var envvars = null
      cmd({
        script: `
          cd ${this.path}
          clever env
        `,
        failure: error => reject(error),
        success: res_env => {
          let raw_envvars = res_env.split('\n')
          envvars = raw_envvars !== null  
            ? raw_envvars
              .filter(item => (!item.startsWith("#")) && (!item == ""))
              .map(item => {return {name:item.split("=")[0], value:item.split("=")[1]} })
            : null
          
          log(`🙂 environment variables are fetched`)
          resolve(envvars)
        }
      })
    })

  } //getEnvironmentVariables

  /**
   * extract services (linked applications and addons)
   */
  getServices() {
    log(`⌛️ get services (linked applications and addons)`)
    return new Promise((resolve, reject) => {
      let services = {}
      cmd({
        script: `
          cd ${this.path}
          clever service
        `,
        failure: error => reject(error),
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
          log(`🙂 services are fetched`)
          resolve(services)
        }
      })
    })
  } //getServices

  /**
   * Link the bucket | obsolete
   */
  attachStorageFolderToBucket({envvars}) {
    log(`⌛️ attach storage folder to bucket`)    
    return new Promise((resolve, reject) => {
      let bucketHost = envvars.find(item => item.name == "BUCKET_HOST") 
      cmd({
        script: `
          cd ${this.path}
          clever env set CC_FS_BUCKET /storage:${bucketHost.value} --alias "${this.name}"
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 bucket attached`)
          resolve(out)
        }
      })
    })

  }// bucketLink

  /**
   * Connect the bucket
   */
  connectToBucket({name, path}) {
    log(`⌛️ connect to ${name} bucket with path /${path}`)    
    return new Promise((resolve, reject) => {
      return this.linkToAddon({name})
        .then(out => {
          return this.getEnvironmentVariables()
          .then(envvars => {
            let bucketHost = envvars.find(item => item.name == "BUCKET_HOST") 
            cmd({
              script: `
                cd ${this.path}
                clever env set CC_FS_BUCKET /${path}:${bucketHost.value} --alias "${this.name}"
              `,
              failure: error => reject(error),
              success: out => {
                log(`🙂 bucket connected`)
                resolve(out)
              }
            })
          })
          .catch(error => reject(error))
        })
        .catch(error => reject(error))
    })
  }


  /**
   * create clever configuration file
   * to define the war file
   */
  createCleverJarJsonFile({jarName}) {
    log(`⌛️ create clever jar.json file for ${jarName}`)    
    
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          # === create clever configuration files ===
          cd ${this.path}
          mkdir clevercloud
          cd clevercloud
          cat > jar.json << EOF
          {"deploy": {"jarName": "${jarName}"}}
          EOF
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 jar.json file created`)
          resolve(out)
        }
      })
    })
  }

  createCleverPHPJsonFile({source}) {
    log(`⌛️ create clever php.json`)    
    
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          # === create clever configuration files ===
          cd ${this.path}
          mkdir clevercloud
          cd clevercloud
          cat > php.json << EOF
          ${source.split("\n").map(item => item.trim()).join("\n")}          
          EOF
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 php.json file created`)
          resolve(out)
        }
      })
    })
  }



  /**
   * Create the git repository
   */
  gitInit() {
    log(`⌛️ initialize git repository in ${this.path}`)        
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          cd ${this.path}
          git init
          git add .
          git commit -m "First 🚀 of ${this.name}"
          git remote add clever git+ssh://git@push-par-clevercloud-customers.services.clever-cloud.com/${this.id}.git
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 git repository initialized`)
          resolve(out)
        }
      })
    })
  }

  gitPush() {
    /**
     * Deploy Application on Clever-Cloud
     */
    log(`⌛️ git push to Clever Cloud`)  
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          cd ${this.path}
          echo "⌛️ wait a little..."
          git push clever master
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 git repository pushed`)
          resolve(out)
        }
      }) // end of deploy
    })
  }

  /**
   * create an executable shell file
   * for hooks
   */
  createExecutableShellScript({scriptName, shell}) {
    log(`⌛️ create executable shell script`)  
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          # === create script ===
          cd ${this.path}
          cat > ${scriptName} << EOF
          ${shell.split("\n").map(item => item.trim()).join("\n")}
          EOF
          chmod +x ${scriptName}
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 executable shell script created`)
          resolve(out)
        }
      })
    })
  }

  createFile({fileName, source}) {
    log(`⌛️ create file`)      
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          # === create script ===
          cd ${this.path}
          cat > ${fileName} << EOF
          ${source.split("\n").map(item => item.trim()).join("\n")}
          EOF
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 file created`)
          resolve(out)
        }
      })
    })
  }



  addPreBuildHook({hook}) {
    log(`⌛️ add pre build hook: ${hook}`) 
    return new Promise((resolve, reject) => {
      let envvar = `CC_PRE_BUILD_HOOK=${hook}`
      cmd({
        script: `
          cd ${this.path}
          clever env set ${envvar.split("=")[0]} ${envvar.split("=")[1]} --alias "${this.name}"
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 pre build hook added`)
          resolve(out)
        }
      })

    })
  }

  download({from, to}) {
    log(`⌛️ downloading ${from}`) 
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          curl -L ${from} --output ${this.path}/${to}     
        `,
        failure: error => reject(error),
        success: out => {
          log(`🙂 download finished`)
          resolve(out)
        }
      })
    })
  }

  
}// Application

let download = ({from, to}) => {
  log(`⌛️ downloading ${from}`) 
  return new Promise((resolve, reject) => {
    cmd({
      script: `
        curl -L ${from} --output ${to}     
      `,
      failure: error => reject(error),
      success: out => {
        log(`🙂 download finished`)
        resolve(out)
      }
    })
  })
}


module.exports = {
  cmd: cmd,
  AddOn: AddOn,
  Application: Application,
  download: download
}

