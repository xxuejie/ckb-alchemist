use super::{utils::blake2b_256, Widget};
use ckb_standalone_types::bytes::Bytes;

#[derive(Default)]
pub struct CkbHash {
    pub content: String,
}

impl Widget for CkbHash {
    fn name(&self) -> String {
        "CKB Hasher".to_string()
    }

    fn ui(&mut self, ui: &mut egui::Ui) {
        ui.label("Content in HEX:");
        ui.text_edit_multiline(&mut self.content);

        let raw_data = {
            let mut value = self.content.as_str();
            if value.starts_with("0x") {
                value = &value[2..];
            }
            match hex::decode(value) {
                Ok(data) => Ok(data),
                Err(e) => Err(format!("Error parsing hex content: {}", e)),
            }
        };

        match raw_data {
            Ok(data) => {
                let script_hash = format!("0x{:x}", Bytes::from(blake2b_256(data).to_vec()));

                ui.horizontal(|ui| {
                    ui.label("Script Hash: ");
                    if ui.button("📋").on_hover_text("Click to copy").clicked() {
                        ui.output_mut(|o| o.copied_text = script_hash.clone());
                    }
                });
                ui.add(egui::Label::new(script_hash).wrap(true));
            }
            Err(e) => {
                ui.label(egui::RichText::new(e).color(egui::Color32::RED));
            }
        }
    }
}
