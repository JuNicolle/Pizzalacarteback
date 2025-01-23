const path = require('path');

class ImageService {
  constructor() {
    this.imagesPath = path.join(__dirname, '../Images');
  }

  getImagePath(imageUrl) {
    return `/images/` + imageUrl;
  }
}

module.exports = new ImageService();