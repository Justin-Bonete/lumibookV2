<?php
namespace App\Services;

use Illuminate\Http\UploadedFile;

/** Gatekeeper for uploaded PDFs: real PDF header + optional ClamAV scan. */
class UploadScanner
{
    public function assertClean(UploadedFile $file): void
    {
        $head = file_get_contents($file->getRealPath(), false, null, 0, 5);
        abort_unless($head === '%PDF-', 422, 'The file is not a valid PDF.');

        if (config('services.clamav.enabled')) {
            exec('clamdscan --no-summary ' . escapeshellarg($file->getRealPath()), $out, $code);
            abort_if($code === 1, 422, 'The file failed the virus scan.');
            abort_if($code > 1, 503, 'Virus scanner unavailable; try again later.');
        }
    }
}
