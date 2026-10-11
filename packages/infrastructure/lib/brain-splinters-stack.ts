import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwAuthorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';

export interface BrainSplintersStackProps extends cdk.StackProps {
  /** e.g. "brainsplinters.com". If omitted, the site is served from the raw CloudFront domain. */
  domainName?: string;
  /** Route 53 hosted zone id for `domainName`. Required if `domainName` is set. */
  hostedZoneId?: string;
}

const API_HANDLERS_DIR = path.join(__dirname, '..', '..', 'api', 'src', 'handlers');
const WEB_BUILD_DIR = path.join(__dirname, '..', '..', '..', 'apps', 'web', 'dist');

export class BrainSplintersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BrainSplintersStackProps = {}) {
    super(scope, id, props);

    const { domainName, hostedZoneId } = props;
    const useCustomDomain = Boolean(domainName && hostedZoneId);

    // ---------------------------------------------------------------------
    // DynamoDB -- single table, simple PK/SK schema (see PLANNING.md).
    // ---------------------------------------------------------------------
    const table = new dynamodb.Table(this, 'Table', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ---------------------------------------------------------------------
    // S3 -- admin-uploaded images (cover images, Post images). Private
    // bucket; files are only ever read back out through the CloudFront
    // `/uploads/*` behavior below, and only ever written via short-lived
    // presigned PUT URLs issued by PresignUploadFn.
    // ---------------------------------------------------------------------
    const uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    // ---------------------------------------------------------------------
    // Cognito -- a single administrator, no public sign-up.
    // ---------------------------------------------------------------------
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'brainsplinters-admin',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient('AdminWebClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // ---------------------------------------------------------------------
    // Lambda functions -- one small, single-purpose function per route.
    // ---------------------------------------------------------------------
    const sharedEnvironment = {
      TABLE_NAME: table.tableName,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
    };

    const bundling: lambdaNodejs.BundlingOptions = {
      format: lambdaNodejs.OutputFormat.ESM,
      target: 'node22',
      mainFields: ['module', 'main'],
      banner:
        "import { createRequire as topLevelCreateRequire } from 'module';\n" +
        'const require = topLevelCreateRequire(import.meta.url);',
    };

    const makeHandler = (
      name: string,
      file: string,
      extraEnvironment: Record<string, string> = {},
    ): lambdaNodejs.NodejsFunction =>
      new lambdaNodejs.NodejsFunction(this, name, {
        entry: path.join(API_HANDLERS_DIR, file),
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        timeout: cdk.Duration.seconds(10),
        environment: { ...sharedEnvironment, ...extraEnvironment },
        bundling,
      });

    const listSplintersFn = makeHandler('ListSplintersFn', 'listSplinters.ts');
    const getSplinterFn = makeHandler('GetSplinterFn', 'getSplinter.ts');
    const listPostsFn = makeHandler('ListPostsFn', 'listPosts.ts');
    const getPostFn = makeHandler('GetPostFn', 'getPost.ts');
    const createSplinterFn = makeHandler('CreateSplinterFn', 'createSplinter.ts');
    const updateSplinterFn = makeHandler('UpdateSplinterFn', 'updateSplinter.ts');
    const deleteSplinterFn = makeHandler('DeleteSplinterFn', 'deleteSplinter.ts');
    const createPostFn = makeHandler('CreatePostFn', 'createPost.ts');
    const updatePostFn = makeHandler('UpdatePostFn', 'updatePost.ts');
    const deletePostFn = makeHandler('DeletePostFn', 'deletePost.ts');
    const createVisitorPostFn = makeHandler('CreateVisitorPostFn', 'createVisitorPost.ts');
    const listVisitorSubmissionsFn = makeHandler(
      'ListVisitorSubmissionsFn',
      'listVisitorSubmissions.ts',
    );
    // UPLOADS_PUBLIC_BASE_URL is filled in below, once the CloudFront
    // distribution (and its custom domain, if any) is known.
    const presignUploadFn = makeHandler('PresignUploadFn', 'presignUpload.ts', {
      UPLOADS_BUCKET_NAME: uploadsBucket.bucketName,
    });
    uploadsBucket.grantPut(presignUploadFn);

    for (const fn of [
      listSplintersFn,
      getSplinterFn,
      listPostsFn,
      getPostFn,
      createSplinterFn,
      updateSplinterFn,
      deleteSplinterFn,
      createPostFn,
      updatePostFn,
      deletePostFn,
      createVisitorPostFn,
      listVisitorSubmissionsFn,
    ]) {
      table.grantReadData(fn);
    }
    for (const fn of [
      createSplinterFn,
      updateSplinterFn,
      deleteSplinterFn,
      createPostFn,
      updatePostFn,
      deletePostFn,
      createVisitorPostFn,
    ]) {
      table.grantWriteData(fn);
    }

    // ---------------------------------------------------------------------
    // API Gateway HTTP API -- public GET routes, JWT-protected write routes.
    // ---------------------------------------------------------------------
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'brainsplinters-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const jwtAuthorizer = new apigwAuthorizers.HttpJwtAuthorizer(
      'AdminAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      { jwtAudience: [userPoolClient.userPoolClientId] },
    );

    const integration = (fn: lambda.IFunction) =>
      new apigwIntegrations.HttpLambdaIntegration(`${fn.node.id}Integration`, fn);

    httpApi.addRoutes({
      path: '/splinters',
      methods: [apigwv2.HttpMethod.GET],
      integration: integration(listSplintersFn),
    });
    httpApi.addRoutes({
      path: '/splinters/{splinterId}',
      methods: [apigwv2.HttpMethod.GET],
      integration: integration(getSplinterFn),
    });
    httpApi.addRoutes({
      path: '/splinters/{splinterId}/posts',
      methods: [apigwv2.HttpMethod.GET],
      integration: integration(listPostsFn),
    });
    httpApi.addRoutes({
      path: '/splinters/{splinterId}/posts/{postId}',
      methods: [apigwv2.HttpMethod.GET],
      integration: integration(getPostFn),
    });

    httpApi.addRoutes({
      path: '/splinters',
      methods: [apigwv2.HttpMethod.POST],
      integration: integration(createSplinterFn),
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/splinters/{splinterId}',
      methods: [apigwv2.HttpMethod.PUT],
      integration: integration(updateSplinterFn),
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/splinters/{splinterId}',
      methods: [apigwv2.HttpMethod.DELETE],
      integration: integration(deleteSplinterFn),
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/splinters/{splinterId}/posts',
      methods: [apigwv2.HttpMethod.POST],
      integration: integration(createPostFn),
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/splinters/{splinterId}/posts/{postId}',
      methods: [apigwv2.HttpMethod.PUT],
      integration: integration(updatePostFn),
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/splinters/{splinterId}/posts/{postId}',
      methods: [apigwv2.HttpMethod.DELETE],
      integration: integration(deletePostFn),
      authorizer: jwtAuthorizer,
    });
    // Public (no authorizer): anonymous visitors submit a Post for review.
    // Throttled below, separately from the rest of the API, since it's the
    // only unauthenticated write route.
    const [createVisitorPostRoute] = httpApi.addRoutes({
      path: '/splinters/{splinterId}/visitor-posts',
      methods: [apigwv2.HttpMethod.POST],
      integration: integration(createVisitorPostFn),
    });
    httpApi.addRoutes({
      path: '/visitor-submissions',
      methods: [apigwv2.HttpMethod.GET],
      integration: integration(listVisitorSubmissionsFn),
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/uploads/presign',
      methods: [apigwv2.HttpMethod.POST],
      integration: integration(presignUploadFn),
      authorizer: jwtAuthorizer,
    });

    // Low-effort abuse protection for the one public write route: cap it
    // well below what a legitimate visitor would ever need, independent of
    // the rest of the API's (default, unthrottled) limits.
    const stage = httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage;
    stage.routeSettings = {
      'POST /splinters/{splinterId}/visitor-posts': {
        ThrottlingRateLimit: 2,
        ThrottlingBurstLimit: 5,
      },
    };
    // The stage's route settings reference this route by key, so the route
    // must be created before the stage is updated with those settings.
    if (createVisitorPostRoute) stage.node.addDependency(createVisitorPostRoute);

    // ---------------------------------------------------------------------
    // Frontend hosting -- private S3 bucket behind CloudFront.
    // ---------------------------------------------------------------------
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Functions rewrite the *origin request* for `/splinter/*` and
    // `/admin*` to the matching built entry point, while the viewer's address
    // bar keeps showing the original URL. Only these path patterns are
    // rewritten -- this is not a site-wide SPA fallback.
    const splinterRewriteFn = new cloudfront.Function(this, 'SplinterRewriteFunction', {
      code: cloudfront.FunctionCode.fromInline(
        `function handler(event) {\n  var request = event.request;\n  request.uri = '/splinter.html';\n  return request;\n}`,
      ),
    });
    const adminRewriteFn = new cloudfront.Function(this, 'AdminRewriteFunction', {
      code: cloudfront.FunctionCode.fromInline(
        `function handler(event) {\n  var request = event.request;\n  request.uri = '/admin.html';\n  return request;\n}`,
      ),
    });

    let certificate: acm.ICertificate | undefined;
    let domainNames: string[] | undefined;
    let hostedZone: route53.IHostedZone | undefined;

    if (useCustomDomain && domainName && hostedZoneId) {
      hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId,
        zoneName: domainName,
      });
      // CloudFront requires certificates in us-east-1 regardless of stack region.
      certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
        domainName,
        subjectAlternativeNames: [`www.${domainName}`],
        hostedZone,
        region: 'us-east-1',
      });
      domainNames = [domainName, `www.${domainName}`];
    }

    const origin = origins.S3BucketOrigin.withOriginAccessControl(siteBucket);
    const uploadsOrigin = origins.S3BucketOrigin.withOriginAccessControl(uploadsBucket);

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      domainNames,
      certificate,
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/splinter/*': {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          functionAssociations: [
            {
              function: splinterRewriteFn,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
        '/admin': {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          functionAssociations: [
            { function: adminRewriteFn, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
          ],
        },
        '/admin/*': {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          functionAssociations: [
            { function: adminRewriteFn, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
          ],
        },
        '/uploads/*': {
          origin: uploadsOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // Uploaded images are served back through this same distribution, so the
    // public URL PresignUploadFn hands out is the site's own domain.
    presignUploadFn.addEnvironment(
      'UPLOADS_PUBLIC_BASE_URL',
      domainName ? `https://${domainName}` : `https://${distribution.distributionDomainName}`,
    );

    if (useCustomDomain && domainName && hostedZone) {
      new route53.ARecord(this, 'ApexAliasRecord', {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(distribution),
        ),
      });
      new route53.ARecord(this, 'WwwAliasRecord', {
        zone: hostedZone,
        recordName: `www.${domainName}`,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(distribution),
        ),
      });
    }

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(WEB_BUILD_DIR)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ---------------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------------
    new cdk.CfnOutput(this, 'SiteUrl', {
      value: domainName ? `https://${domainName}` : `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
  }
}
