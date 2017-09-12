const exec = require('child_process').exec;

let cmd = ({script, failure, success}) => {
  var result = null
  let process = exec(script.split("\n").map(item => item.trim()).join("\n"), (error, stdout, stderr) => {})
  process.stderr.on('data', error => result = error)
  process.stdout.on('data', data => result = data)
  process.on('exit', code => code == 0 ? success(result) : failure(result))
}

module.exports = {
  cmd: cmd
}