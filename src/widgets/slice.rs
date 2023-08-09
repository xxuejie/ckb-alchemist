use super::{
    utils::{decode_hex, restore_from_slot_widget, save_to_slot_widget},
    GlobalContext, Widget,
};
use core::str::FromStr;

#[derive(Default)]
pub struct Slice {
    pub input: String,
    pub start: String,
    pub end: String,

    pub input_slot: Option<u64>,
    pub output_slot: Option<u64>,
}

impl Widget for Slice {
    fn name(&self) -> String {
        "Slicer".to_string()
    }

    fn remove(&mut self, global_context: &mut GlobalContext) {
        if let Some(slot) = self.output_slot {
            global_context.remove_slot(slot);
        }
    }

    fn ui(&mut self, ui: &mut egui::Ui, global_context: &mut GlobalContext) {
        let data = decode_hex(&self.input);
        let start =
            usize::from_str(&self.start).map_err(|e| format!("Error parsing number: {}", e));
        let end = usize::from_str(&self.end).map_err(|e| format!("Error parsing number: {}", e));

        let data = match (data, start, end) {
            (Ok(data), Ok(start), Ok(end)) => {
                if start > end {
                    Err("Start must be smaller or equal to end!".to_string())
                } else if end > data.len() {
                    Err("End exceeds data range!".to_string())
                } else {
                    Ok(format!("0x{:x}", data.slice(start..end)))
                }
            }
            (Err(e), _, _) => Err(e),
            (_, Err(e), _) => Err(e),
            (_, _, Err(e)) => Err(e),
        };

        egui::Grid::new("slice")
            .num_columns(2)
            .striped(true)
            .max_col_width(400.0)
            .show(ui, |ui| {
                ui.label("Input in HEX:");
                restore_from_slot_widget(
                    ui,
                    true,
                    &mut self.input,
                    &mut self.input_slot,
                    global_context,
                );
                ui.end_row();

                ui.label("Slicing start:");
                ui.text_edit_singleline(&mut self.start);
                ui.end_row();

                ui.label("Slicing end:");
                ui.text_edit_singleline(&mut self.end);
                ui.end_row();
            });

        match data {
            Ok(output) => {
                ui.horizontal(|ui| {
                    ui.label("Result: ");
                    if ui.button("📋").on_hover_text("Click to copy").clicked() {
                        ui.output_mut(|o| o.copied_text = output.clone());
                    }
                    save_to_slot_widget(ui, &output, &mut self.output_slot, global_context);
                });
                ui.add(egui::Label::new(output).wrap(true));
            }
            Err(e) => {
                ui.label(egui::RichText::new(e).color(egui::Color32::RED));
            }
        }
    }
}
