use super::{
    utils::{blake2b_256, decode_hex, restore_from_slot_widget, save_to_slot_widget},
    GlobalContext, Widget,
};
use ckb_standalone_types::bytes::Bytes;

#[derive(Default)]
pub struct CkbHash {
    pub content: String,
    pub content_slot: Option<u64>,
    pub hash_slot: Option<u64>,
}

impl CkbHash {
    pub fn set_content_slot(&mut self, slot_id: u64) {
        self.content_slot = Some(slot_id);
    }
}

impl Widget for CkbHash {
    fn name(&self) -> String {
        "CKB Hasher".to_string()
    }

    fn remove(&mut self, global_context: &mut GlobalContext) {
        if let Some(slot) = self.hash_slot {
            global_context.remove_slot(slot);
        }
    }

    fn ui(&mut self, ui: &mut egui::Ui, global_context: &mut GlobalContext) {
        let raw_data = decode_hex(&self.content);

        egui::Grid::new("script")
            .num_columns(2)
            .striped(true)
            .max_col_width(400.0)
            .show(ui, |ui| {
                ui.label("Content in HEX:");
                restore_from_slot_widget(
                    ui,
                    true,
                    &mut self.content,
                    &mut self.content_slot,
                    global_context,
                );
                ui.end_row();
            });

        match raw_data {
            Ok(data) => {
                let script_hash = format!("0x{:x}", Bytes::from(blake2b_256(data).to_vec()));

                ui.horizontal(|ui| {
                    ui.label("Script Hash: ");
                    if ui.button("📋").on_hover_text("Click to copy").clicked() {
                        ui.output_mut(|o| o.copied_text = script_hash.clone());
                    }
                    save_to_slot_widget(ui, &script_hash, &mut self.hash_slot, global_context);
                });
                ui.add(egui::Label::new(script_hash).wrap(true));
            }
            Err(e) => {
                ui.label(egui::RichText::new(e).color(egui::Color32::RED));
            }
        }
    }
}
