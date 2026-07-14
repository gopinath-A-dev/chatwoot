class AddPinnedToConversations < ActiveRecord::Migration[7.1]
  def change
    add_column :conversations, :pinned, :boolean, default: false, null: false
    add_column :conversations, :pinned_at, :datetime
    add_column :conversations, :pinned_by_id, :bigint

    add_index :conversations, [:account_id, :pinned]
  end
end
