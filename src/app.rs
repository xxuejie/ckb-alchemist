use ckb_standalone_types::{bytes::Bytes, core::ScriptHashType, packed::Script, prelude::*};

fn blake2b_256<T: AsRef<[u8]>>(s: T) -> [u8; 32] {
    let mut result = [0u8; 32];
    let mut hasher = blake2b_ref::Blake2bBuilder::new(32)
        .personal(b"ckb-default-hash")
        .build();
    hasher.update(s.as_ref());
    hasher.finalize(&mut result);
    result
}

pub struct RootApp {
    pub script_hash_window: ScriptHash,
    pub script_hash_open: bool,
    pub ckb_hash_window: CkbHash,
    pub ckb_hash_open: bool,
}

impl Default for RootApp {
    fn default() -> Self {
        Self {
            script_hash_window: ScriptHash::default(),
            script_hash_open: true,
            ckb_hash_window: CkbHash::default(),
            ckb_hash_open: true,
        }
    }
}

impl RootApp {
    /// Called once before the first frame.
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        Default::default()
    }
}

impl eframe::App for RootApp {
    /// Called each time the UI needs repainting, which may be many times per second.
    /// Put your widgets into a `SidePanel`, `TopPanel`, `CentralPanel`, `Window` or `Area`.
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::SidePanel::right("Tools").show(ctx, |ui| {
            ui.heading("Tools");
            ui.separator();

            egui::containers::ScrollArea::vertical().show(ui, |ui| {
                ui.toggle_value(&mut self.script_hash_open, self.script_hash_window.name());
                ui.toggle_value(&mut self.ckb_hash_open, self.ckb_hash_window.name());
            });

            ui.with_layout(egui::Layout::bottom_up(egui::Align::LEFT), |ui| {
                ui.horizontal(|ui| {
                    ui.spacing_mut().item_spacing.x = 0.0;
                    ui.label("powered by ");
                    ui.hyperlink_to("egui", "https://github.com/emilk/egui");
                    ui.label(" and ");
                    ui.hyperlink_to(
                        "eframe",
                        "https://github.com/emilk/egui/tree/master/crates/eframe",
                    );
                    ui.label(".");
                });
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            // The central panel the region left after adding TopPanel's and SidePanel's

            ui.heading("CKB Alchemist");
            ui.hyperlink("https://github.com/xxuejie/ckb-alchemist");
            ui.label("A toolbox for Nervos CKB utility functions");
            egui::warn_if_debug_build(ui);
        });

        self.script_hash_window
            .draw(ctx, &mut self.script_hash_open);
        self.ckb_hash_window.draw(ctx, &mut self.script_hash_open);
    }
}

pub struct ScriptHash {
    pub code_hash: String,
    pub hash_type: ScriptHashType,
    pub args: String,
}

impl Default for ScriptHash {
    fn default() -> Self {
        Self {
            code_hash: "0x0000000000000000000000000000000000000000000000000000000000000000"
                .to_string(),
            hash_type: ScriptHashType::Data,
            args: String::default(),
        }
    }
}

impl ScriptHash {
    pub fn name(&self) -> String {
        "Script Hash Calculator".to_string()
    }

    pub fn draw(&mut self, ctx: &egui::Context, open: &mut bool) {
        egui::Window::new(self.name())
            .open(open)
            .show(ctx, |ui| self.ui(ui));
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

#[derive(Default)]
pub struct CkbHash {
    pub content: String,
}

impl CkbHash {
    pub fn name(&self) -> String {
        "CKB Hasher".to_string()
    }

    pub fn draw(&mut self, ctx: &egui::Context, open: &mut bool) {
        egui::Window::new(self.name())
            .open(open)
            .show(ctx, |ui| self.ui(ui));
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
                let script_hash = format!("0x{:x}", Bytes::from(blake2b_256(&data).to_vec()));

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
