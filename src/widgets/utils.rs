use super::GlobalContext;
use ckb_standalone_types::bytes::Bytes;

pub fn blake2b_256<T: AsRef<[u8]>>(s: T) -> [u8; 32] {
    let mut result = [0u8; 32];
    let mut hasher = blake2b_ref::Blake2bBuilder::new(32)
        .personal(b"ckb-default-hash")
        .build();
    hasher.update(s.as_ref());
    hasher.finalize(&mut result);
    result
}

pub fn decode_hex(mut s: &str) -> Result<Bytes, String> {
    if s.starts_with("0x") {
        s = &s[2..];
    }
    hex::decode(s)
        .map(|data| Bytes::from(data))
        .map_err(|e| format!("Error parsing hex content: {}", e))
}

pub fn save_to_slot_widget(
    ui: &mut egui::Ui,
    value: &str,
    slot: &mut Option<u64>,
    global_context: &mut GlobalContext,
) {
    match slot {
        Some(slot) => {
            global_context.update_slot(*slot, value.to_string());
            ui.label(
                egui::RichText::new(format!("Saved to slot {}", slot)).color(egui::Color32::YELLOW),
            );
        }
        None => {
            if ui
                .button("💾")
                .on_hover_text("Click to save to new slot")
                .clicked()
            {
                let id = global_context.new_slot(value.to_string());
                *slot = Some(id);
            }
        }
    }
}

pub fn restore_from_slot_widget(
    ui: &mut egui::Ui,
    multiline: bool,
    manual_edit_value: &mut String,
    slot: &mut Option<u64>,
    global_context: &mut GlobalContext,
) {
    let slot_content = match slot {
        Some(slot_id) => match global_context.fetch_slot(*slot_id) {
            Some(value) => Some((*slot_id, value)),
            None => {
                // A slot is available but the actual value is missing, this
                // could be due to the fact that a window gets removed.
                *slot = None;
                None
            }
        },
        None => None,
    };
    match slot_content {
        Some((mut slot_id, value)) => {
            ui.horizontal(|ui| {
                if ui
                    .button("💰")
                    .on_hover_text("Using slot value, click to manually edit the value")
                    .clicked()
                {
                    *slot = None;
                }
                ui.vertical_centered(|ui| {
                    egui::ComboBox::from_label("Select a slot")
                        .selected_text(format!("Slot {}", slot_id))
                        .show_ui(ui, |ui| {
                            for available_id in global_context.available_slots() {
                                ui.selectable_value(
                                    &mut slot_id,
                                    available_id,
                                    format!("Slot {}", available_id),
                                );
                            }
                        });
                    // Ideally we want to update this only when combobox
                    // changes value, but for immediate mode UI this seems
                    // to be working fine.
                    *slot = Some(slot_id);
                    *manual_edit_value = value.clone();
                    ui.add(egui::Label::new(value).wrap(true));
                });
            });
        }
        None => {
            ui.horizontal(|ui| {
                let slots = global_context.available_slots();
                if (!slots.is_empty())
                    && ui
                        .button("🔄")
                        .on_hover_text("Click to load from slots")
                        .clicked()
                {
                    *slot = Some(slots[0]);
                }
                if multiline {
                    ui.text_edit_multiline(manual_edit_value);
                } else {
                    ui.text_edit_singleline(manual_edit_value);
                }
            });
        }
    }
}
