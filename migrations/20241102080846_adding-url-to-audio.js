exports.up = function (knex) {
    return knex.schema
      .table('audio_files', (table) => {
        table.string('url').notNullable();
      });
  };
  
  exports.down = function (knex) {
    return knex.schema
      .table('audio_files', (table) => {
        table.dropColumn('url');
      });
  };