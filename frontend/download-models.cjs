const fs = require('fs');
const https = require('https');
const path = require('path');

const baseURL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const dir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log('Descargando modelos...');

files.forEach(file => {
  const dest = path.join(dir, file);
  const fileStream = fs.createWriteStream(dest);
  https.get(baseURL + file, response => {
    response.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      console.log('Descargado:', file);
    });
  }).on('error', err => {
    fs.unlink(dest, () => {});
    console.error('Error:', err.message);
  });
});
