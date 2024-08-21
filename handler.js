const { convertTo } = require('@shelf/aws-lambda-libreoffice');
const { readFileSync } = require('fs');
const path = require('path');
const https = require('https');

const downloadFile = (url, filePath) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const contentType = response.headers['content-type'];
        let fileExtension;

        if (contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
          fileExtension = '.pptx';
        } else if (contentType === 'application/vnd.ms-powerpoint') {
          fileExtension = '.ppt';
        } else {
          reject(`Unsupported content type: ${contentType}`);
          return;
        }

        const finalFilePath = `${filePath}${fileExtension}`;
        const file = require('fs').createWriteStream(finalFilePath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(fileExtension);
        });
      } else {
        reject(`Failed to download file: ${response.statusCode}`);
      }
    }).on('error', (err) => {
      reject(`Error: ${err.message}`);
    });
  });
};

module.exports.handler = async (event) => {
  const {presignedUrl} = JSON.parse(event.body || '{}');
 
  if (!presignedUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'presignedUrl is required in the request body' })
    };
  }

  const inputFileName = 'inputFile';

  try {
    const fileExtension = await downloadFile(presignedUrl, `/tmp/${inputFileName}`);
    const powerpointFilename = `${inputFileName}${fileExtension}`
  
    // convertTo is expecting the file to be in /tmp, but doesn't want it passed in the parameter
    await convertTo(powerpointFilename, 'pdf');
    const pdfContent = readFileSync(`/tmp/${inputFileName}.pdf`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${inputFileName}.pdf"`,
        'Access-Control-Allow-Origin': '*' // Add CORS header if needed
      },
      body: pdfContent.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Conversion failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Conversion failed', details: error.message })
    };
  }
};