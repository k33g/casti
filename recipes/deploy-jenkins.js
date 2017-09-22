#!/usr/bin/env node

const {cmd, download, AddOn, Application} = require('../lib/casti')

// --- Define the FS-Buckets Addon ---
let bucketAddOn = AddOn.of({
  name:"my-jenkins-bucket-20170922-00",
  type:"fs-bucket",
  plan:"s",
  organization:"wey-yu", 
  region:"eu"
})

// --- Define the application ---
let myJenkins = Application.of({
  name:"my-jenkins-20170922-00",
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
  
  await download({
    from: "http://mirrors.jenkins.io/war/latest/jenkins.war",
    to: `${myJenkins.path}/jenkins.war`
  })

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


