import * as migration_20260602_102342 from './20260602_102342';
import * as migration_20260603_090218 from './20260603_090218';
import * as migration_20260605_164437 from './20260605_164437';
import * as migration_20260608_070151_drop_content_pages from './20260608_070151_drop_content_pages';
import * as migration_20260611_075337_discord_notifications from './20260611_075337_discord_notifications';
import * as migration_20260619_204518_page_builder_blocks from './20260619_204518_page_builder_blocks';

export const migrations = [
  {
    up: migration_20260602_102342.up,
    down: migration_20260602_102342.down,
    name: '20260602_102342',
  },
  {
    up: migration_20260603_090218.up,
    down: migration_20260603_090218.down,
    name: '20260603_090218',
  },
  {
    up: migration_20260605_164437.up,
    down: migration_20260605_164437.down,
    name: '20260605_164437',
  },
  {
    up: migration_20260608_070151_drop_content_pages.up,
    down: migration_20260608_070151_drop_content_pages.down,
    name: '20260608_070151_drop_content_pages',
  },
  {
    up: migration_20260611_075337_discord_notifications.up,
    down: migration_20260611_075337_discord_notifications.down,
    name: '20260611_075337_discord_notifications',
  },
  {
    up: migration_20260619_204518_page_builder_blocks.up,
    down: migration_20260619_204518_page_builder_blocks.down,
    name: '20260619_204518_page_builder_blocks'
  },
];
