use super::{
    utils::{decode_hex, restore_from_slot_widget, save_to_slot_widget},
    GlobalContext, Output, Widget,
};
use core::str::FromStr;

#[derive(Default)]
pub struct Slice {
    pub input: String,
    pub start: String,
    pub end: String,
    pub input_slot: Option<u64>,

    pub output: Output,
}

impl Slice {
    fn calculate_output(&self) -> Result<String, String> {
        let data = decode_hex(&self.input)?;
        let start =
            usize::from_str(&self.start).map_err(|e| format!("Error parsing number: {}", e))?;
        let end = usize::from_str(&self.end).map_err(|e| format!("Error parsing number: {}", e))?;

        if start > end {
            Err("Start must be smaller or equal to end!".to_string())
        } else if end > data.len() {
            Err("End exceeds data range!".to_string())
        } else {
            Ok(format!("0x{:x}", data.slice(start..end)))
        }
    }
}

impl Widget for Slice {
    fn name(&self) -> String {
        "Slicer".to_string()
    }

    fn refresh(&mut self) {
        self.output.set_data(self.calculate_output());
    }

    fn output_slots(&self) -> Vec<&Output> {
        vec![&self.output]
    }

    fn remove(&mut self, global_context: &mut GlobalContext) {
        if let Some(slot) = self.output.slot() {
            global_context.remove_slot(*slot);
        }
    }

    fn ui(&mut self, ui: &mut egui::Ui, global_context: &mut GlobalContext) -> bool {
        let mut changed = false;

        egui::Grid::new("slice")
            .num_columns(2)
            .striped(true)
            .max_col_width(400.0)
            .show(ui, |ui| {
                ui.label("Input in HEX:");
                if restore_from_slot_widget(
                    ui,
                    true,
                    &mut self.input,
                    &mut self.input_slot,
                    global_context,
                ) {
                    changed = true;
                };
                ui.end_row();

                ui.label("Slicing start:");
                if ui.text_edit_singleline(&mut self.start).changed() {
                    changed = true;
                }
                ui.end_row();

                ui.label("Slicing end:");
                if ui.text_edit_singleline(&mut self.end).changed() {
                    changed = true;
                }
                ui.end_row();
            });

        match self.output.data().clone() {
            Ok(output) => {
                ui.horizontal(|ui| {
                    ui.label("Result: ");
                    if ui.button("📋").on_hover_text("Click to copy").clicked() {
                        ui.output_mut(|o| o.copied_text = output.clone());
                    }
                    if save_to_slot_widget(ui, self.output.slot()) {
                        self.output
                            .set_slot(global_context.new_slot(output.clone()));
                        changed = true;
                    }
                });
                ui.add(egui::Label::new(output).wrap(true));
            }
            Err(e) => {
                ui.label(egui::RichText::new(e).color(egui::Color32::RED));
            }
        }

        changed
    }
}
