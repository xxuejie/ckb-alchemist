use super::{
    utils::{decode_hex, restore_from_slot_widget, save_to_slot_widget},
    GlobalContext, Output, Widget,
};

#[derive(Default)]
pub struct Concat {
    pub input1: String,
    pub input2: String,

    pub input1_slot: Option<u64>,
    pub input2_slot: Option<u64>,

    pub output: Output,
}

impl Concat {
    fn calculate_output(&self) -> Result<String, String> {
        let raw1 = decode_hex(&self.input1)?;
        let raw2 = decode_hex(&self.input2)?;

        Ok(format!("0x{:x}{:x}", raw1, raw2))
    }
}

impl Widget for Concat {
    fn name(&self) -> String {
        "Concatenator".to_string()
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

        egui::Grid::new("concat")
            .num_columns(2)
            .striped(true)
            .max_col_width(400.0)
            .show(ui, |ui| {
                ui.label("Input 1 in HEX:");
                if restore_from_slot_widget(
                    ui,
                    true,
                    &mut self.input1,
                    &mut self.input1_slot,
                    global_context,
                ) {
                    changed = true;
                };
                ui.end_row();

                ui.label("Input 2 in HEX:");
                restore_from_slot_widget(
                    ui,
                    true,
                    &mut self.input2,
                    &mut self.input2_slot,
                    global_context,
                );
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
