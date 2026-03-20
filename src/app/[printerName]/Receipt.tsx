'use client';

export interface ReceiptState {
  id: string;
  previewSrc: string | null;
  filename: string | null;
  curtainWidth: number;
  wiggling: boolean;
  bwFilter: boolean;
  printed: boolean;
}

interface ReceiptProps {
  receipt: ReceiptState;
}

export default function Receipt({ receipt }: ReceiptProps) {
  return (
    <div className={`receiptcontainer ${receipt.wiggling ? 'wiggler' : ''}`}>
      <div className={`receiptpadder ${receipt.printed ? 'printed' : ''}`}>
        <div className="receiptbackground">
          <div className="preview">
            {receipt.filename ? (
              <p>{receipt.filename}</p>
            ) : (
              <img
                className={`previewimg ${receipt.bwFilter ? 'bwfilter' : ''}`}
                src={receipt.previewSrc || '#'}
                width="250"
                alt=""
              />
            )}
            <div className="curtain" style={{ width: receipt.curtainWidth + '%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
