mod ckb_hash;
mod script;
mod utils;

pub use ckb_hash::CkbHash;
pub use script::ScriptAssembler;

pub trait Widget {
    fn name(&self) -> String;
    fn ui(&mut self, ui: &mut egui::Ui);

    fn draw(&mut self, ctx: &egui::Context, open: &mut bool, id: u64) {
        egui::Window::new(self.name())
            .id(egui::Id::new(id))
            .open(open)
            .show(ctx, |ui| self.ui(ui));
    }
}
