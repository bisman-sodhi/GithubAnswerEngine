const { pipeline } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

async function downloadModel() {
  console.log('Downloading model files...');
  const modelDir = path.join(process.cwd(), 'public', 'models');
  
  // Create models directory if it doesn't exist
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  try {
    await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2', {
      revision: 'main',
      cache_dir: modelDir,
    });
    console.log('Model files downloaded successfully!');
  } catch (error) {
    console.error('Error downloading model files:', error);
    process.exit(1);
  }
}

downloadModel(); 