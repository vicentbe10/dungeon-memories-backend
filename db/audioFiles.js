const knex = require('knex')(require('../knexfile').development);

module.exports = {
  addAudioFile: (audioFile) => {
    return knex('audio_files').insert(audioFile).returning('*');
  },
  // TO DO - Add more functions as needed
};