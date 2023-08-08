use super::{
    utils::{decode_hex, restore_from_slot_widget, save_to_slot_widget},
    GlobalContext, Output, Widget,
};
use ckb_standalone_types::{
    packed::{Byte, Script},
    prelude::*,
};
use core::str::FromStr;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ScriptHashTypeInner {
    Data,
    Type,
    Data1,
    DataN,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ScriptHashType {
    pub inner: ScriptHashTypeInner,
    pub n: String,
}

impl Default for ScriptHashType {
    fn default() -> Self {
        ScriptHashType {
            inner: ScriptHashTypeInner::Data,
            n: String::default(),
        }
    }
}

impl TryFrom<ScriptHashType> for Byte {
    type Error = String;

    fn try_from(value: ScriptHashType) -> Result<Self, Self::Error> {
        Ok(Byte::new(match value.inner {
            ScriptHashTypeInner::Data => 0,
            ScriptHashTypeInner::Type => 1,
            ScriptHashTypeInner::Data1 => 2,
            ScriptHashTypeInner::DataN => match u8::from_str(&value.n) {
                Ok(n) => {
                    if n <= 127 {
                        n << 1
                    } else {
                        return Err(format!(
                            "It is not possible to build data version {}!",
                            value.n
                        ));
                    }
                }
                Err(e) => return Err(format!("Error parsing n: {}", e)),
            },
        }))
    }
}

pub struct ScriptAssembler {
    pub code_hash: String,
    pub hash_type: ScriptHashType,
    pub args: String,

    pub code_hash_slot: Option<u64>,
    pub args_slot: Option<u64>,

    pub script: Output,
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
        let parsed_hash_type = self.hash_type.clone().try_into()?;
        let parsed_args = decode_hex(&self.args);
        match (parsed_code_hash, parsed_args) {
            (Ok(code_hash), Ok(args)) => Ok(Script::new_builder()
                .code_hash(code_hash)
                .hash_type(parsed_hash_type)
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
        if let Some(slot_id) = self.script.slot() {
            return Ok(*slot_id);
        }
        let id = global_context.new_slot(self.script()?);
        self.script.set_slot(id);
        Ok(id)
    }
}

impl Default for ScriptAssembler {
    fn default() -> Self {
        let mut h = Self {
            code_hash: "0x0000000000000000000000000000000000000000000000000000000000000000"
                .to_string(),
            hash_type: ScriptHashType::default(),
            args: String::default(),
            script: Output::default(),
            code_hash_slot: None,
            args_slot: None,
        };
        h.refresh();
        h
    }
}

impl Widget for ScriptAssembler {
    fn name(&self) -> String {
        "Script Assembler".to_string()
    }

    fn refresh(&mut self) {
        self.script.set_data(self.script());
    }

    fn output_slots(&self) -> Vec<&Output> {
        vec![&self.script]
    }

    fn remove(&mut self, global_context: &mut GlobalContext) {
        if let Some(slot) = self.script.slot() {
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
                ui.label("Code Hash: ");
                if restore_from_slot_widget(
                    ui,
                    false,
                    &mut self.code_hash,
                    &mut self.code_hash_slot,
                    global_context,
                ) {
                    changed = true;
                }
                ui.end_row();

                ui.label("Hash Type:");
                ui.horizontal(|ui| {
                    if ui
                        .selectable_value(
                            &mut self.hash_type.inner,
                            ScriptHashTypeInner::Data,
                            "Data",
                        )
                        .clicked()
                    {
                        changed = true;
                    }
                    if ui
                        .selectable_value(
                            &mut self.hash_type.inner,
                            ScriptHashTypeInner::Data1,
                            "Data1",
                        )
                        .clicked()
                    {
                        changed = true;
                    }
                    if ui
                        .selectable_value(
                            &mut self.hash_type.inner,
                            ScriptHashTypeInner::Type,
                            "Type",
                        )
                        .clicked()
                    {
                        changed = true;
                    }
                    if ui
                        .selectable_value(
                            &mut self.hash_type.inner,
                            ScriptHashTypeInner::DataN,
                            "DataN",
                        )
                        .clicked()
                    {
                        changed = true;
                    }

                    if self.hash_type.inner == ScriptHashTypeInner::DataN
                        && ui.text_edit_singleline(&mut self.hash_type.n).changed()
                    {
                        changed = true;
                    }
                });
                ui.end_row();

                ui.label("Args: ");
                if restore_from_slot_widget(
                    ui,
                    false,
                    &mut self.args,
                    &mut self.args_slot,
                    global_context,
                ) {
                    changed = true;
                }
                ui.end_row();

                ui.end_row();

                if let Ok(script_bytes) = self.script.data().clone() {
                    ui.horizontal(|ui| {
                        ui.label("Serialized script: ");
                        if ui.button("📋").on_hover_text("Click to copy").clicked() {
                            ui.output_mut(|o| o.copied_text = script_bytes.clone());
                        }
                        if save_to_slot_widget(ui, self.script.slot()) {
                            self.script
                                .set_slot(global_context.new_slot(script_bytes.clone()));
                        }
                    });
                    ui.add(egui::Label::new(script_bytes.clone()).wrap(true));
                    ui.end_row();

                    ui.label("Script length:");
                    ui.label(format!("{}", script_bytes.len() / 2 - 1));
                    ui.end_row();
                }
            });

        if let Err(e) = self.script.data() {
            ui.label(egui::RichText::new(e).color(egui::Color32::RED));
        }

        changed
    }
}
