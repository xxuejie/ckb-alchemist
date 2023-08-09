use super::{utils::blake2b_256, Widget};
use ckb_standalone_types::{bytes::Bytes, core::ScriptHashType, packed::Script, prelude::*};

pub struct ScriptAssembler {
    pub code_hash: String,
    pub hash_type: ScriptHashType,
    pub args: String,
}

impl Default for ScriptAssembler {
    fn default() -> Self {
        Self {
            code_hash: "0x0000000000000000000000000000000000000000000000000000000000000000"
                .to_string(),
            hash_type: ScriptHashType::Data,
            args: String::default(),
        }
    }
}

impl Widget for ScriptAssembler {
    fn name(&self) -> String {
        "Script Assembler".to_string()
    }

    fn ui(&mut self, ui: &mut egui::Ui) {
        let parsed_code_hash = {
            let mut data = [0u8; 32];
            let mut value = self.code_hash.as_str();
            if value.starts_with("0x") {
                value = &value[2..];
            }
            match hex::decode_to_slice(value, &mut data) {
                Ok(_) => Ok(data.pack()),
                Err(e) => Err(format!("Error parsing code hash: {}", e)),
            }
        };
        let parsed_args = {
            let mut value = self.args.as_str();
            if value.starts_with("0x") {
                value = &value[2..];
            }
            match hex::decode(value) {
                Ok(data) => Ok(data.pack()),
                Err(e) => Err(format!("Error parsing args: {}", e)),
            }
        };
        let result = match (parsed_code_hash, parsed_args) {
            (Ok(code_hash), Ok(args)) => Ok(Script::new_builder()
                .code_hash(code_hash)
                .hash_type(self.hash_type.into())
                .args(args)
                .build()),
            (Err(e), _) => Err(e),
            (_, Err(e)) => Err(e),
        };

        egui::Grid::new("script")
            .num_columns(2)
            .striped(true)
            .max_col_width(400.0)
            .show(ui, |ui| {
                ui.label("Code Hash: ");
                ui.text_edit_singleline(&mut self.code_hash);
                ui.end_row();

                ui.label("Hash Type:");
                ui.horizontal(|ui| {
                    ui.selectable_value(&mut self.hash_type, ScriptHashType::Data, "Data");
                    ui.selectable_value(&mut self.hash_type, ScriptHashType::Data1, "Data1");
                    ui.selectable_value(&mut self.hash_type, ScriptHashType::Type, "Type");
                });
                ui.end_row();

                ui.label("Args: ");
                ui.text_edit_singleline(&mut self.args);
                ui.end_row();

                ui.end_row();

                if let Ok(script) = &result {
                    let script_bytes = format!("0x{:x}", script.as_bytes());
                    ui.horizontal(|ui| {
                        ui.label("Serialized script: ");
                        if ui.button("📋").on_hover_text("Click to copy").clicked() {
                            ui.output_mut(|o| o.copied_text = script_bytes.clone());
                        }
                    });
                    ui.add(egui::Label::new(script_bytes).wrap(true));
                    ui.end_row();

                    ui.label("Script length:");
                    ui.label(format!("{}", script.as_slice().len()));
                    ui.end_row();

                    let script_hash = format!(
                        "0x{:x}",
                        Bytes::from(blake2b_256(script.as_slice()).to_vec())
                    );
                    ui.horizontal(|ui| {
                        ui.label("Script Hash: ");
                        if ui.button("📋").on_hover_text("Click to copy").clicked() {
                            ui.output_mut(|o| o.copied_text = script_hash.clone());
                        }
                    });
                    ui.add(egui::Label::new(script_hash).wrap(true));
                    ui.end_row();
                }
            });

        if let Err(e) = result {
            ui.label(egui::RichText::new(e).color(egui::Color32::RED));
        }
    }
}
