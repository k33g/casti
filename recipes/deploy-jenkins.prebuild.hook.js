#!/usr/bin/env node

const {cmd, download, AddOn, Application} = require('../lib/casti')

// --- Define the FS-Buckets Addon ---
let bucketAddOn = AddOn.of({
  name:"my-jenkins-bucket-20170922-03",
  type:"fs-bucket",
  plan:"s",
  organization:"wey-yu", 
  region:"eu"
})

// --- Define the application ---
let myJenkins = Application.of({
  name:"my-jenkins-20170922-03",
  type:"war",
  flavor:"M",
  organization:"wey-yu",
  region:"par",
  envvars:["JAVA_VERSION=8", "JENKINS_HOME=/app/storage/.jenkins", "PORT=8080"],
})

// --- Steps ---
async function deployJenkins() {
  await bucketAddOn.create()

  await myJenkins.create()

  await myJenkins.connectToBucket({name:bucketAddOn.name, path: "storage"})

  await myJenkins.createExecutableShellScript({
    scriptName: "install.sh",
    shell:`
      #!/bin/sh
      echo "Jenkins setup and deployment is started"
      curl -L http://mirrors.jenkins.io/war/latest/jenkins.war --output jenkins.war
    `
  })
  
  await myJenkins.addPreBuildHook({hook:"./install.sh"})
  await myJenkins.createCleverJarJsonFile({jarName:"jenkins.war"})
  await myJenkins.gitInit()
  await myJenkins.gitPush()

}

deployJenkins()
  .then(res => {
    console.log("😀 Deployment ok")
    console.log(`🌍 http://${myJenkins.name}.cleverapps.io`)
  })
  .catch(error => console.log("😡 ouch!", error))


