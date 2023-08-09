use super::{
    utils::{decode_hex, restore_from_slot_widget, save_to_slot_widget},
    GlobalContext, Widget,
};
use ckb_standalone_types::{core::ScriptHashType, packed::Script, prelude::*};

pub struct ScriptAssembler {
    pub code_hash: String,
    pub hash_type: ScriptHashType,
    pub args: String,

    pub code_hash_slot: Option<u64>,
    pub args_slot: Option<u64>,
    pub script_slot: Option<u64>,
}

impl ScriptAssembler {
    pub fn script(&self) -> Result<String, String> {
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
        let parsed_args = decode_hex(&self.args);
        match (parsed_code_hash, parsed_args) {
            (Ok(code_hash), Ok(args)) => Ok(Script::new_builder()
                .code_hash(code_hash)
                .hash_type(self.hash_type.into())
                .args(args.pack())
                .build()),
            (Err(e), _) => Err(e),
            (_, Err(e)) => Err(e),
        }
        .map(|script| format!("0x{:x}", script.as_bytes()))
    }

    pub fn create_script_output_slot(
        &mut self,
        global_context: &mut GlobalContext,
    ) -> Result<u64, String> {
        if let Some(slot_id) = self.script_slot {
            return Ok(slot_id);
        }
        let id = global_context.new_slot(self.script()?);
        self.script_slot = Some(id);
        Ok(id)
    }
}

impl Default for ScriptAssembler {
    fn default() -> Self {
        Self {
            code_hash: "0x0000000000000000000000000000000000000000000000000000000000000000"
                .to_string(),
            hash_type: ScriptHashType::Data,
            args: String::default(),
            code_hash_slot: None,
            args_slot: None,
            script_slot: None,
        }
    }
}

impl Widget for ScriptAssembler {
    fn name(&self) -> String {
        "Script Assembler".to_string()
    }

    fn remove(&mut self, global_context: &mut GlobalContext) {
        if let Some(slot) = self.script_slot {
            global_context.remove_slot(slot);
        }
    }

    fn ui(&mut self, ui: &mut egui::Ui, global_context: &mut GlobalContext) {
        let result = self.script();

        egui::Grid::new("script")
            .num_columns(2)
            .striped(true)
            .max_col_width(400.0)
            .show(ui, |ui| {
                ui.label("Code Hash: ");
                restore_from_slot_widget(
                    ui,
                    false,
                    &mut self.code_hash,
                    &mut self.code_hash_slot,
                    global_context,
                );
                ui.end_row();

                ui.label("Hash Type:");
                ui.horizontal(|ui| {
                    ui.selectable_value(&mut self.hash_type, ScriptHashType::Data, "Data");
                    ui.selectable_value(&mut self.hash_type, ScriptHashType::Data1, "Data1");
                    ui.selectable_value(&mut self.hash_type, ScriptHashType::Type, "Type");
                });
                ui.end_row();

                ui.label("Args: ");
                restore_from_slot_widget(
                    ui,
                    false,
                    &mut self.args,
                    &mut self.args_slot,
                    global_context,
                );
                ui.end_row();

                ui.end_row();

                if let Ok(script_bytes) = &result {
                    ui.horizontal(|ui| {
                        ui.label("Serialized script: ");
                        if ui.button("📋").on_hover_text("Click to copy").clicked() {
                            ui.output_mut(|o| o.copied_text = script_bytes.clone());
                        }
                        save_to_slot_widget(
                            ui,
                            script_bytes,
                            &mut self.script_slot,
                            global_context,
                        );
                    });
                    ui.add(egui::Label::new(script_bytes).wrap(true));
                    ui.end_row();

                    ui.label("Script length:");
                    ui.label(format!("{}", script_bytes.len() / 2 - 1));
                    ui.end_row();
                }
            });

        if let Err(e) = result {
            ui.label(egui::RichText::new(e).color(egui::Color32::RED));
        }
    }
}
