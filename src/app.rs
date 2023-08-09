use crate::widgets::{CkbHash, ScriptAssembler, Widget};

pub struct RootApp {
    pub widgets: Vec<(Box<dyn Widget>, bool, u64)>,
    pub counter: u64,
}

impl Default for RootApp {
    fn default() -> Self {
        Self {
            widgets: vec![(Box::<ScriptAssembler>::default(), true, 0)],
            counter: 1,
        }
    }
}

impl RootApp {
    /// Called once before the first frame.
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        Default::default()
    }

    fn next_id(&mut self) -> u64 {
        let result = self.counter;
        self.counter += 1;
        result
    }

    fn add_widget(&mut self, widget: Box<dyn Widget>) {
        let id = self.next_id();
        self.widgets.push((widget, true, id));
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
                if ui.button("Script Assembler").clicked() {
                    self.add_widget(Box::<ScriptAssembler>::default());
                }
                if ui.button("CKB Hash").clicked() {
                    self.add_widget(Box::<CkbHash>::default());
                }
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

        // Remove all closed widgets
        self.widgets.retain_mut(|(_, opened, _)| *opened);
        // Draw opened widgets
        for (widget, opened, id) in self.widgets.iter_mut() {
            widget.draw(ctx, opened, *id);
        }
    }
}
