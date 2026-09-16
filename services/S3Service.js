const AWS = require("aws-sdk");

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

exports.uploadToS3 = async (data, filename) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: filename,
        Body: data,
        ContentType: "application/json",
        ACL:"public-read"
    };

    const result = await s3.upload(params).promise();
    return result.Location;
};