#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BrainSplintersStack } from '../lib/brain-splinters-stack';

const app = new cdk.App();

// Optional custom domain. Deploys without one (using the raw CloudFront
// domain name) if these context values aren't supplied. See README for how
// to pass them: `cdk deploy -c domainName=brainsplinters.com -c hostedZoneId=Z123...`
const domainName = app.node.tryGetContext('domainName') as string | undefined;
const hostedZoneId = app.node.tryGetContext('hostedZoneId') as string | undefined;

new BrainSplintersStack(app, 'BrainSplintersStack', {
  domainName,
  hostedZoneId,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
