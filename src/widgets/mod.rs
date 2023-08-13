mod ckb_hash;
mod concat;
mod script;
mod slice;
mod utils;

pub use ckb_hash::CkbHash;
pub use concat::Concat;
pub use script::ScriptAssembler;
pub use slice::Slice;

use std::collections::HashMap;

pub struct Output {
    data: Result<String, String>,
    slot: Option<u64>,
}

impl Default for Output {
    fn default() -> Self {
        Self {
            data: Err(String::default()),
            slot: None,
        }
    }
}

impl Output {
    pub fn data(&self) -> &Result<String, String> {
        &self.data
    }

    pub fn slot(&self) -> &Option<u64> {
        &self.slot
    }

    pub fn set_data(&mut self, data: Result<String, String>) {
        self.data = data;
    }

    pub fn set_slot(&mut self, slot_id: u64) {
        self.slot = Some(slot_id);
    }

    pub fn propagate(&self, global_context: &mut GlobalContext) {
        if let (Some(slot_id), Ok(data)) = (&self.slot, &self.data) {
            global_context.update_slot(*slot_id, data.clone());
        }
    }
}

pub trait Widget {
    fn name(&self) -> String;
    fn ui(&mut self, ui: &mut egui::Ui, global_context: &mut GlobalContext) -> bool;
    fn refresh(&mut self);
    fn output_slots(&self) -> Vec<&Output>;

    fn draw(
        &mut self,
        ctx: &egui::Context,
        widget_context: &mut WidgetContext,
        global_context: &mut GlobalContext,
    ) {
        egui::Window::new(self.name())
            .id(egui::Id::new(widget_context.id))
            .open(&mut widget_context.open)
            .show(ctx, |ui| {
                let changed = self.ui(ui, global_context);
                if changed {
                    self.refresh();
                    for output in self.output_slots() {
                        output.propagate(global_context);
                    }
                }
            });
    }

    fn attach(&mut self, _global_context: &mut GlobalContext) {
        self.refresh();
    }
    fn remove(&mut self, _global_context: &mut GlobalContext) {}
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct WidgetContext {
    pub open: bool,
    pub id: u64,
}

impl WidgetContext {
    pub fn new(id: u64) -> Self {
        Self { open: true, id }
    }
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct GlobalContext {
    slots: HashMap<u64, String>,
    counter: u64,
}

impl GlobalContext {
    pub fn new_slot(&mut self, default_value: String) -> u64 {
        let id = self.counter;
        self.counter += 1;
        self.slots.insert(id, default_value);
        id
    }

    pub fn fetch_slot(&self, slot_id: u64) -> Option<String> {
        self.slots.get(&slot_id).cloned()
    }

    pub fn available_slots(&self) -> Vec<u64> {
        self.slots.keys().copied().collect()
    }

    pub fn update_slot(&mut self, slot_id: u64, value: String) {
        self.slots.insert(slot_id, value);
    }

    pub fn remove_slot(&mut self, slot_id: u64) {
        self.slots.remove(&slot_id);
    }
}
