class AddPinnedToMessages < ActiveRecord::Migration[7.1]
  def change
    add_column :messages, :pinned, :boolean, default: false, null: false
    add_column :messages, :pinned_at, :datetime
    add_column :messages, :pinned_by_id, :bigint

    add_index :messages, [:conversation_id, :pinned]
  end
end
