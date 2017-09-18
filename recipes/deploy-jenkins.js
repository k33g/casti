#!/usr/bin/env node

const {cmd, download, AddOn, Application} = require('../lib/casti')

// --- Define the FS-Buckets Addon ---
let bucketAddOn = AddOn.of({
  name:"my-jenkins-bucket-09182017-00",
  type:"fs-bucket",
  plan:"s",
  organization:"wey-yu", 
  region:"eu"
})

// --- Define the application ---
let myJenkins = Application.of({
  name:"my-jenkins-09182017-00",
  type:"war",
  flavor:"M",
  organization:"wey-yu",
  region:"par",
  envvars:["JAVA_VERSION=8", "JENKINS_HOME=/app/storage/.jenkins", "PORT=8080"],
})

// --- Steps ---
async function deployJenkins() {
  console.log(`⌛️ creating ${bucketAddOn.name}`)
  await bucketAddOn.create()
  console.log(`🙂 creation of ${bucketAddOn.name} is ok`)

  console.log(`⌛️ provisioning of ${myJenkins.name}`)
  await myJenkins.create()
  console.log(`🙂 creation of ${myJenkins.name} is ok`)

  console.log(`⌛️ linking ${bucketAddOn.name} to ${myJenkins.name}`)
  await myJenkins.linkToAddon({name:bucketAddOn.name})
  var envvars = await myJenkins.getEnvironmentVariables()
  await myJenkins.attachStorageFolderToBucket({envvars:envvars})
  console.log(`🙂 ${bucketAddOn.name} linked to ${myJenkins.name}`)

  console.log(`⌛️ downloading of jenkins.war`)
  await download({
    from: "http://mirrors.jenkins.io/war/latest/jenkins.war",
    to: `${myJenkins.path}/jenkins.war`
  })
  console.log(`🙂 jenkins.war downloaded`)

  console.log(`⌛️ creating configuration json file of ${myJenkins.name}`)
  await myJenkins.createCleverJarJsonFile({jarName:"jenkins.war"})
  console.log(`🙂 configuration json file created`)

  console.log(`⌛️ initializing git repository`)
  await myJenkins.gitInit()
  console.log(`🙂 git repository initialized`)

  console.log(`⌛️ deploying to Clever Cloud ☁️`)
  await myJenkins.gitPush()

}

deployJenkins()
  .then(res => {
    console.log("😀 Deployment ok")
    console.log(`🌍 http://${myJenkins.name}.cleverapps.io`)
  })
  .catch(error => console.log("😡 ouch!", error))


