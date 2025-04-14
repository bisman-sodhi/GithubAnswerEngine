const { pipeline } = require('@xenova/transformers');

async function downloadModel() {
  console.log('Downloading model files...');
  try {
    await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2', {
      revision: 'main',
      cache_dir: './public/models',
    });
    console.log('Model files downloaded successfully!');
  } catch (error) {
    console.error('Error downloading model files:', error);
    process.exit(1);
  }
}

downloadModel(); 