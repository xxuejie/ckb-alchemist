use crate::widgets::{CkbHash, Concat, GlobalContext, ScriptAssembler, Widget, WidgetContext};

pub struct RootApp {
    pub widgets: Vec<(Box<dyn Widget>, WidgetContext)>,
    pub counter: u64,
    pub context: GlobalContext,
}

impl Default for RootApp {
    fn default() -> Self {
        let mut app = Self {
            widgets: vec![],
            counter: 0,
            context: GlobalContext::default(),
        };
        // Create an initial layout for illustration of usage.
        let mut script_assembler = Box::<ScriptAssembler>::default();
        let mut ckb_hash = Box::<CkbHash>::default();
        let slot_id = script_assembler
            .create_script_output_slot(&mut app.context)
            .expect("create slot");
        ckb_hash.set_content_slot(slot_id);
        app.add_widget(script_assembler);
        app.add_widget(ckb_hash);
        app
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
        self.widgets.push((widget, WidgetContext::new(id)));
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
                if ui.button("Concat").clicked() {
                    self.add_widget(Box::<Concat>::default());
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
            ui.label("The default example here illustrates the concept of slots. One can save the output from one window (e.g., serialized script bytes, ckb hashes) into global slots, then use slots as inputs to other windows. One we we might implement visualizations such as node graphs for this purpose, but for now, slots provides an easy solution with non-intrusive code.");
            egui::warn_if_debug_build(ui);
        });

        // Remove all closed widgets
        self.widgets.retain_mut(|(w, c)| {
            if !c.open {
                w.remove(&mut self.context);
            }
            c.open
        });
        // Draw opened widgets
        for (widget, c) in self.widgets.iter_mut() {
            widget.draw(ctx, c, &mut self.context);
        }
    }
}
