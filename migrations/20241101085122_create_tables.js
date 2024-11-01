exports.up = function (knex) {
    return knex.schema
      .createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').notNullable().unique();
        table.string('email').notNullable().unique();
        table.string('password_hash').notNullable();
        table.timestamps(true, true);
      })
      .createTable('sessions', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.integer('user_id').unsigned().references('id').inTable('users');
        table.timestamps(true, true);
      })
      .createTable('audio_files', (table) => {
        table.increments('id').primary();
        table.string('filename').notNullable();
        table.integer('session_id').unsigned().references('id').inTable('sessions');
        table.integer('user_id').unsigned().references('id').inTable('users');
        table.timestamps(true, true);
      })
      .createTable('transcriptions', (table) => {
        table.increments('id').primary();
        table.text('content').notNullable();
        table.integer('audio_file_id').unsigned().references('id').inTable('audio_files');
        table.timestamps(true, true);
      })
      .createTable('images', (table) => {
        table.increments('id').primary();
        table.string('url').notNullable();
        table.integer('transcription_id').unsigned().references('id').inTable('transcriptions');
        table.timestamps(true, true);
      });
  };
  
  exports.down = function (knex) {
    return knex.schema
      .dropTableIfExists('images')
      .dropTableIfExists('transcriptions')
      .dropTableIfExists('audio_files')
      .dropTableIfExists('sessions')
      .dropTableIfExists('users');
  };