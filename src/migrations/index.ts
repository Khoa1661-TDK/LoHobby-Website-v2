import * as migration_20260602_102342 from './20260602_102342';
import * as migration_20260603_090218 from './20260603_090218';
import * as migration_20260605_164437 from './20260605_164437';
import * as migration_20260608_070151_drop_content_pages from './20260608_070151_drop_content_pages';
import * as migration_20260611_075337_discord_notifications from './20260611_075337_discord_notifications';
import * as migration_20260619_204518_page_builder_blocks from './20260619_204518_page_builder_blocks';
import * as migration_20260621_053000_relax_page_block_required from './20260621_053000_relax_page_block_required';
import * as migration_20260621_155341_localize_pages from './20260621_155341_localize_pages';
import * as migration_20260622_131922_page_builder_link_text_button_social from './20260622_131922_page_builder_link_text_button_social';
import * as migration_20260622_141438_page_builder_dark_custom_bg from './20260622_141438_page_builder_dark_custom_bg';
import * as migration_20260623_045912_page_builder_section_library from './20260623_045912_page_builder_section_library';
import * as migration_20260624_061944_cancellation_fields from './20260624_061944_cancellation_fields';
import * as migration_20260624_114553_discord_command_registration from './20260624_114553_discord_command_registration';
import * as migration_20260624_173519_add_block_key from './20260624_173519_add_block_key';
import * as migration_20260624_173719_promo_banner_background_image from './20260624_173719_promo_banner_background_image';
import * as migration_20260627_132058_block_expansion from './20260627_132058_block_expansion';
import * as migration_20260629_152734_scroll_animation_presets from './20260629_152734_scroll_animation_presets';
import * as migration_20260630_140550_lohobby_blocks from './20260630_140550_lohobby_blocks';

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
    name: '20260619_204518_page_builder_blocks',
  },
  {
    up: migration_20260621_053000_relax_page_block_required.up,
    down: migration_20260621_053000_relax_page_block_required.down,
    name: '20260621_053000_relax_page_block_required',
  },
  {
    up: migration_20260621_155341_localize_pages.up,
    down: migration_20260621_155341_localize_pages.down,
    name: '20260621_155341_localize_pages',
  },
  {
    up: migration_20260622_131922_page_builder_link_text_button_social.up,
    down: migration_20260622_131922_page_builder_link_text_button_social.down,
    name: '20260622_131922_page_builder_link_text_button_social',
  },
  {
    up: migration_20260622_141438_page_builder_dark_custom_bg.up,
    down: migration_20260622_141438_page_builder_dark_custom_bg.down,
    name: '20260622_141438_page_builder_dark_custom_bg',
  },
  {
    up: migration_20260623_045912_page_builder_section_library.up,
    down: migration_20260623_045912_page_builder_section_library.down,
    name: '20260623_045912_page_builder_section_library',
  },
  {
    up: migration_20260624_061944_cancellation_fields.up,
    down: migration_20260624_061944_cancellation_fields.down,
    name: '20260624_061944_cancellation_fields',
  },
  {
    up: migration_20260624_114553_discord_command_registration.up,
    down: migration_20260624_114553_discord_command_registration.down,
    name: '20260624_114553_discord_command_registration',
  },
  {
    up: migration_20260624_173519_add_block_key.up,
    down: migration_20260624_173519_add_block_key.down,
    name: '20260624_173519_add_block_key',
  },
  {
    up: migration_20260624_173719_promo_banner_background_image.up,
    down: migration_20260624_173719_promo_banner_background_image.down,
    name: '20260624_173719_promo_banner_background_image',
  },
  {
    up: migration_20260627_132058_block_expansion.up,
    down: migration_20260627_132058_block_expansion.down,
    name: '20260627_132058_block_expansion',
  },
  {
    up: migration_20260629_152734_scroll_animation_presets.up,
    down: migration_20260629_152734_scroll_animation_presets.down,
    name: '20260629_152734_scroll_animation_presets',
  },
  {
    up: migration_20260630_140550_lohobby_blocks.up,
    down: migration_20260630_140550_lohobby_blocks.down,
    name: '20260630_140550_lohobby_blocks'
  },
];
