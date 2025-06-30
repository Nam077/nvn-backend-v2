import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Sequelize } from 'sequelize-typescript';

async function checkTrigger() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sequelize = app.get(Sequelize);

  const triggerName = 'trigger_update_from_categories';
  const tableName = 'categories';

  const query = `
    SELECT
      t.tgname AS trigger_name,
      c.relname AS table_name,
      p.proname AS function_name,
      t.tgenabled AS enabled_status
    FROM
      pg_trigger t
    JOIN
      pg_class c ON t.tgrelid = c.oid
    JOIN
      pg_proc p ON t.tgfoid = p.oid
    WHERE
      c.relname = :tableName
      AND t.tgname = :triggerName;
  `;

  try {
    console.log(`\n🔍 Checking for trigger [${triggerName}] on table [${tableName}]...`);
    const [result]: any = await sequelize.query(query, {
      replacements: { tableName, triggerName },
      type: 'SELECT',
    });

    console.log('--- TRIGGER DIAGNOSTIC RESULTS ---');
    if (result) {
      console.log('  ✅ SUCCESS: Trigger found!');
      console.log('     -> Trigger Name: ', result.trigger_name);
      console.log('     -> Table Name:   ', result.table_name);
      console.log('     -> Function Name:', result.function_name);
      console.log('     -> Status:       ', result.enabled_status === 'O' ? 'Enabled' : 'Disabled');
    } else {
      console.log(`  ❌ FAILURE: Trigger [${triggerName}] was NOT FOUND on table [${tableName}].`);
    }
    console.log('-------------------------------------\n');

  } catch (error) {
    if (error instanceof Error) {
        console.error('Error executing query:', error.message);
    } else {
        console.error('An unknown error occurred', error);
    }
  } finally {
    await app.close();
  }
}

checkTrigger(); 