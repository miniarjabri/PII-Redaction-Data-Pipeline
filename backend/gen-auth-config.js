/**
Browserslist: caniuse-lite is outdated. Please run: npx update-browserslist-db @ latest
 */

const fs = require('fs');
const data = require('./cdk-outputs.json');
const optargs = process.argv.slice(2);

if(optargs[0] === 'app'){
    const config = {
        "Auth": {
            "region": data["CdkPIIAppStack"]["region"],
            "userPoolId": data["CdkPIIAppStack"]["userPoolId"],
            "identityPoolId": data["CdkPIIAppStack"]["identityPoolId"],
            "userPoolWebClientId": data["CdkPIIAppStack"]["userPoolWebClientId"],
            "RootBucket": data["CdkPIIAppStack"]["RootBucket"]
        },
        "FunctionUrls":{
            "GetWfFunctionUrl" : data["PIILambdaStack"]["getwflambdaurl"]
        }
    };
    
    fs.writeFileSync("../frontend/public/amplify.js", "window.authdata="+JSON.stringify(config));
    fs.writeFileSync("../frontend/build/amplify.js", "window.authdata="+JSON.stringify(config));
}

if(optargs[0] === 'web'){
    try {
        // Check if the output exists in the expected format
        if (data['PIIWebDeployStack'] && data['PIIWebDeployStack']['webappdomain']) {
            console.log("PII Proof of Concept Application deployed and accessible at url → https://main."+data['PIIWebDeployStack']['webappdomain']);
        }
        // Check if it's in the format shown in the deployment output
        else if (data['PIIWebDeployStack.webappdomain']) {
            console.log("PII Proof of Concept Application deployed and accessible at url → https://main."+data['PIIWebDeployStack.webappdomain']);
        }
        // Fallback to just showing what we have
        else {
            console.log("PII Proof of Concept Application deployed. Available outputs:", Object.keys(data));
            console.log("Full output data:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Error accessing deployment outputs:", error);
        console.log("Available data:", JSON.stringify(data, null, 2));
    }
}
