import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { BlockDefinition } from "../../app/shared";

type BlockFormState = {
  name: string;
};

type BlockManagementPageProps = {
  editingBlockId: string | null;
  blockForm: BlockFormState;
  setBlockForm: Dispatch<SetStateAction<BlockFormState>>;
  loading: boolean;
  blockOptions: BlockDefinition[];
  onSubmitBlock: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  cancelEditBlock: () => void;
  startEditBlock: (block: BlockDefinition) => void;
  deleteBlock: (block: BlockDefinition) => Promise<void>;
};

export function BlockManagementPage({
  editingBlockId,
  blockForm,
  setBlockForm,
  loading,
  blockOptions,
  onSubmitBlock,
  cancelEditBlock,
  startEditBlock,
  deleteBlock,
}: BlockManagementPageProps) {
  return (
    <section className="dashboard compact-management-page">
      <form className="card admin-form" onSubmit={onSubmitBlock}>
        <h3>{editingBlockId ? "Blok Degistir" : "Blok Ekle"}</h3>
        <label>
          Blok Adi
          <input
            value={blockForm.name}
            onChange={(e) => setBlockForm({ name: e.target.value })}
            placeholder="B Blok"
            required
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {editingBlockId ? "Degisiklikleri Kaydet" : "Blok Ekle"}
        </button>
        {editingBlockId && (
          <button className="btn btn-ghost" type="button" onClick={cancelEditBlock}>
            Iptal
          </button>
        )}
      </form>

      <div className="card table-card">
        <h3>Blok Listesi</h3>
        <div className="table-wrap">
          <table className="filter-table">
            <thead>
              <tr>
                <th>Blok</th>
                <th>Daire Sayisi</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {blockOptions.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.apartmentCount}</td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => startEditBlock(item)}>
                      Degistir
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteBlock(item)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {blockOptions.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty">
                    Blok kaydi yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
