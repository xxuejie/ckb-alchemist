use super::{
    utils::{blake2b_256, decode_hex, restore_from_slot_widget, save_to_slot_widget},
    GlobalContext, Output, Widget,
};
use ckb_standalone_types::bytes::Bytes;

#[derive(Default)]
pub struct CkbHash {
    pub content: String,
    pub content_slot: Option<u64>,
    pub hash: Output,
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

    fn refresh(&mut self) {
        self.hash.set_data(
            decode_hex(&self.content)
                .map(|raw| format!("0x{:x}", Bytes::from(blake2b_256(raw).to_vec()))),
        );
    }

    fn output_slots(&self) -> Vec<&Output> {
        vec![&self.hash]
    }

    fn remove(&mut self, global_context: &mut GlobalContext) {
        if let Some(slot) = self.hash.slot() {
            global_context.remove_slot(*slot);
        }
    }

    fn ui(&mut self, ui: &mut egui::Ui, global_context: &mut GlobalContext) -> bool {
        let mut changed = false;

        egui::Grid::new("script")
            .num_columns(2)
            .striped(true)
            .max_col_width(400.0)
            .show(ui, |ui| {
                ui.label("Content in HEX:");
                if restore_from_slot_widget(
                    ui,
                    true,
                    &mut self.content,
                    &mut self.content_slot,
                    global_context,
                ) {
                    changed = true;
                };
                ui.end_row();
            });

        match self.hash.data().clone() {
            Ok(script_hash) => {
                ui.horizontal(|ui| {
                    ui.label("Script Hash: ");
                    if ui.button("📋").on_hover_text("Click to copy").clicked() {
                        ui.output_mut(|o| o.copied_text = script_hash.clone());
                    }
                    if save_to_slot_widget(ui, self.hash.slot()) {
                        self.hash
                            .set_slot(global_context.new_slot(script_hash.clone()));
                        changed = true;
                    }
                });
                ui.add(egui::Label::new(script_hash).wrap(true));
            }
            Err(e) => {
                ui.label(egui::RichText::new(e).color(egui::Color32::RED));
            }
        }

        changed
    }
}
