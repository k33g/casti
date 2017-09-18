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

  create({failure, success}) {
    let script = `clever addon create ${this.type} "${this.name}" --plan ${this.plan} --org ${this.organization} --region ${this.region}`
    cmd({
      script: script,
      failure: error => failure(error),
      success: out => success(out)
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

  create({failure, success}) {

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
    cmd({
      script: script,
      failure: error => failure(error),
      success: out => {
        /**
         * Clever Tools create a `.clever.json` with application information
         */
        let config = require(`${this.path}/.clever.json`).apps[0]
        this.id = config.app_id // Clever application Id
        success(out)
      }
    })
  }
 
  linkToAddon({addon}, {failure, success}) {
    cmd({
      script: `
        cd ${this.path}
        clever service link-addon ${addon} --alias "${this.name}"
      `,
      failure: error => failure(error),
      success: out => {
        success(out)
      }
    })
  }

  setEnvironmentVariable({envvar},{failure, success}) {
    cmd({
      script: `
        cd ${this.path}
        clever env set ${envvar.split("=")[0]} ${envvar.split("=")[1]} --alias "${this.name}"
      `,
      failure: error => failure(error),
      success: out => {
        success(out)
      }
    })
  }

  /**
   * extract environment variables
   * useful to retrieve the uri of a database for example
   */
  getEnvironmentVariables({failure, success}) {
    var envvars = null
    cmd({
      script: `
        cd ${this.path}
        clever env
      `,
      failure: error => failure(error),
      success: res_env => {
        let raw_envvars = res_env.split('\n')
        envvars = raw_envvars !== null  
          ? raw_envvars
            .filter(item => (!item.startsWith("#")) && (!item == ""))
            .map(item => {return {name:item.split("=")[0], value:item.split("=")[1]} })
          : null
        
        success(envvars)
      }
    })
  } //getEnvironmentVariables

  /**
   * extract services (linked applications and addons)
   */
  getServices({failure, success}) {
    let services = {}
    cmd({
      script: `
        cd ${this.path}
        clever service
      `,
      failure: error => failure(error),
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
        success(services)
      }
    })
  } //getServices

  /**
   * Link the bucket
   */
  attachToBucket({failure, success}) {
    this.getEnvironmentVariables({
      failure: error => failure(error),
      success: envvars => {
        let bucketHost = envvars.find(item => item.name == "BUCKET_HOST") 
        cmd({
          script: `
            cd ${this.path}
            clever env set CC_FS_BUCKET /storage:${bucketHost.value} --alias "${this.name}"
          `,
          failure: error => failure(error),
          success: out => success(out)
        })
      }
    })

  }// bucketLink

  /**
   * create clever configuration file
   * to define the war file
   */
  createCleverJarJsonFile({jarName}, {failure, success}) {

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
      failure: error => failure(error),
      success: out => success(out)
    })
  }

  /**
   * Create the git repository
   */
  gitInit({failure, success}) {

    cmd({
      script: `
        cd ${this.path}
        git init
        git add .
        git commit -m "First 🚀 of ${this.name}"
        git remote add clever git+ssh://git@push-par-clevercloud-customers.services.clever-cloud.com/${this.id}.git
      `,
      failure: error => failure(error),
      success: out => success(out)
    })
  }

  gitPush({failure, success}) {
    /**
     * Deploy Application on Clever-Cloud
     */
    cmd({
      script: `
        cd ${this.path}
        echo "⌛️ wait a little..."
        git push clever master
      `,
      failure: error => failure(error),
      success: out => success(out)
    }) // end of deploy
  }

}// Application

let download = ({from,to}, {failure, success}) => {
  cmd({
    script: `
      curl -L ${from} --output ${to}     
    `,
    failure: error => failure(error),
    success: out => success(out)
  })
}


module.exports = {
  cmd: cmd,
  AddOn: AddOn,
  Application: Application,
  download: download
}

