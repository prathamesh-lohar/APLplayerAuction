require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadLocalPhotos(directoryPath) {
    const files = fs.readdirSync(directoryPath);
    const csvRows = ['Name,Category,Base Price,Photo'];
    
    for (const file of files) {
        if (!file.match(/\.(jpg|jpeg|png)$/i)) continue;
        
        const playerName = path.parse(file).name;
        
        console.log(`Uploading ${file}...`);
        try {
            const result = await cloudinary.uploader.upload(path.join(directoryPath, file), {
                folder: 'players',
                public_id: playerName.replace(/\s+/g, '_')
            });
            
            // Format: name, category, base price, photo url
            // Update Category and Base Price manually later, or parse out of filename
            csvRows.push(`"${playerName}","Batsman","5","${result.secure_url}"`);
        } catch (error) {
            console.error(`Failed to upload ${file}:`, error.message);
        }
    }
    
    fs.writeFileSync('generated-players.csv', csvRows.join('\n'));
    console.log('\n✅ Created generated-players.csv with all uploaded photo URLs!');
}

// Example usage: node upload-local-photos.js ./my_player_photos
const dir = process.argv[2];
if (dir) uploadLocalPhotos(dir);
else console.log('Please provide a directory path. Format: node upload-local-photos.js ./path/to/folder');
