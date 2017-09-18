const exec = require('child_process').exec;

let cmd = ({script, failure, success}) => {
  var result = null
  let process = exec(script.split("\n").map(item => item.trim()).join("\n"), (error, stdout, stderr) => {})
  process.stderr.on('data', error => result = error)
  process.stdout.on('data', data => result = data)
  process.on('exit', code => code == 0 ? success(result) : failure(result))
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
    let script = `clever addon create ${this.type} "${this.name}" --plan ${this.plan} --org ${this.organization} --region ${this.region}`
    
    return new Promise((resolve, reject) => {
      cmd({
        script: script,
        failure: error => reject(error),
        success: out => resolve(out)
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
          let config = require(`${this.path}/.clever.json`).apps[0]
          this.id = config.app_id // Clever application Id
          resolve(out)
        }
      })
    })

  }
 
  linkToAddon({name}) {
    return  new Promise((resolve, reject) => {
      cmd({
        script: `
          cd ${this.path}
          clever service link-addon ${name} --alias "${this.name}"
        `,
        failure: error => reject(error),
        success: out => resolve(out)
      })
    })
  }

  setEnvironmentVariable({envvar}) {
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          cd ${this.path}
          clever env set ${envvar.split("=")[0]} ${envvar.split("=")[1]} --alias "${this.name}"
        `,
        failure: error => reject(error),
        success: out => resolve(out)
      })
    })
  }

  /**
   * extract environment variables
   * useful to retrieve the uri of a database for example
   */
  getEnvironmentVariables() {
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
          
            resolve(envvars)
        }
      })
    })

  } //getEnvironmentVariables

  /**
   * extract services (linked applications and addons)
   */
  getServices() {
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
          resolve(services)
        }
      })
    })
  } //getServices

  /**
   * Link the bucket
   */
  attachStorageFolderToBucket_old() {
    return new Promise((resolve, reject) => {
      return this.getEnvironmentVariables().then(envvars => {
        let bucketHost = envvars.find(item => item.name == "BUCKET_HOST") 
        cmd({
          script: `
            cd ${this.path}
            clever env set CC_FS_BUCKET /storage:${bucketHost.value} --alias "${this.name}"
          `,
          failure: error => reject(error),
          success: out => resolve(out)
        })
      }).catch(error => reject(error))
    })

  }// bucketLink

  attachStorageFolderToBucket({envvars}) {
    return new Promise((resolve, reject) => {
      let bucketHost = envvars.find(item => item.name == "BUCKET_HOST") 
      cmd({
        script: `
          cd ${this.path}
          clever env set CC_FS_BUCKET /storage:${bucketHost.value} --alias "${this.name}"
        `,
        failure: error => reject(error),
        success: out => resolve(out)
      })
    })

  }// bucketLink


  /**
   * create clever configuration file
   * to define the war file
   */
  createCleverJarJsonFile({jarName}) {
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
        success: out => resolve(out)
      })
    })
  }

  /**
   * Create the git repository
   */
  gitInit() {
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
        success: out => resolve(out)
      })
    })
  }

  gitPush() {
    /**
     * Deploy Application on Clever-Cloud
     */
    return new Promise((resolve, reject) => {
      cmd({
        script: `
          cd ${this.path}
          echo "⌛️ wait a little..."
          git push clever master
        `,
        failure: error => reject(error),
        success: out => resolve(out)
      }) // end of deploy
    })
  }

}// Application

let download = ({from,to}) => {
  return new Promise((resolve, reject) => {
    cmd({
      script: `
        curl -L ${from} --output ${to}     
      `,
      failure: error => reject(error),
      success: out => resolve(out)
    })
  })
}


module.exports = {
  cmd: cmd,
  AddOn: AddOn,
  Application: Application,
  download: download
}

