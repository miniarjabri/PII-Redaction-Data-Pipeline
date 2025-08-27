
/**
 * Deploys the React app to Amplify front end hosting via
 * Amazon S3 assets.
 */

const {Stack, CfnOutput} = require('aws-cdk-lib');
const amplify = require('@aws-cdk/aws-amplify-alpha');
const assets = require('aws-cdk-lib/aws-s3-assets');
const path = require('path');

class PIIWebDeployStack extends Stack{

    constructor(scope, id, props){
        super(scope, id, props);

        /**
         * Create amplify web app (front end) using the CodeCommit repo
         */                
         const web_amplify_app = new amplify.App(this, "react-app", {
                                                            appName: "react-med-app"
                                                        });
        web_amplify_app.addCustomRule(amplify.CustomRule.SINGLE_PAGE_APPLICATION_REDIRECT);

        web_amplify_app.addBranch("main",{                                        
                                        asset: new assets.Asset(this, 'webapp-asset',{
                                            path: path.join(__dirname,'../../frontend/build')
                                        })
                                    });

        new CfnOutput(this, 'web-app-domain', {
            value: web_amplify_app.defaultDomain,
            description: 'Web App Domain',
            exportName: 'webAppDomain'
        });
    }
}

module.exports = { PIIWebDeployStack }
