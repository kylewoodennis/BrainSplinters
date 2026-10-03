import { describe, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BrainSplintersStack } from '../lib/brain-splinters-stack';

describe('BrainSplintersStack', () => {
  it('synthesizes the core resources without a custom domain', () => {
    const app = new cdk.App();
    const stack = new BrainSplintersStack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
    });

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);

    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('adds Route 53 records and a certificate when a custom domain is configured', () => {
    const app = new cdk.App();
    const stack = new BrainSplintersStack(app, 'TestStackWithDomain', {
      domainName: 'brainsplinters.com',
      hostedZoneId: 'Z123456EXAMPLE',
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Route53::RecordSet', 2);
  });
});
