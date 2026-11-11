<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    private function rule() { return PasswordRule::min(10)->mixedCase()->numbers(); }

    public function register(Request $r)
    {
        $data = $r->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190|unique:users',
            'password' => ['required', 'confirmed', $this->rule()],
        ]);
        // Public sign-up can only ever create members; admins are seeded/promoted by the owner.
        $user = User::create($data + ['role' => 'member', 'status' => 'active']);
        event(new Registered($user)); // sends the verification email
        return response()->json(['token' => $user->createToken('web')->plainTextToken, 'user' => $user], 201);
    }

    public function login(Request $r)
    {
        $r->validate(['email' => 'required|email', 'password' => 'required']);
        // Manual check: API routes have no session, so Auth::attempt() would fail here.
        $user = User::where('email', $r->email)->first();
        abort_unless($user && Hash::check($r->password, $user->password), 422, 'Invalid credentials.');
        abort_if($user->status !== 'active', 403, 'This account is suspended.');
        return ['token' => $user->createToken('web')->plainTextToken, 'user' => $user];
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()->delete();
        return response()->noContent();
    }

    /** Signed link from the verification email. */
    public function verify(Request $r, int $id, string $hash)
    {
        $user = User::findOrFail($id);
        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }
        return redirect(rtrim(config('lumibook.frontend_url'), '/') . '/login?verified=1');
    }

    public function resendVerification(Request $r)
    {
        if ($r->user()->hasVerifiedEmail()) return ['message' => 'Your email is already verified.'];
        $r->user()->sendEmailVerificationNotification();
        return ['message' => 'Verification email sent.'];
    }

    public function forgot(Request $r)
    {
        $r->validate(['email' => 'required|email']);
        Password::sendResetLink($r->only('email'));
        return ['message' => 'If that email is registered, a reset link is on its way.']; // same answer either way
    }

    public function reset(Request $r)
    {
        $r->validate(['token' => 'required', 'email' => 'required|email', 'password' => ['required', 'confirmed', $this->rule()]]);
        $status = Password::reset($r->only('email', 'password', 'password_confirmation', 'token'), function (User $u, string $pw) {
            $u->forceFill(['password' => $pw])->save();
            $u->tokens()->delete(); // sign out every device
            event(new PasswordReset($u));
        });
        abort_unless($status === Password::PASSWORD_RESET, 422, 'This reset link is invalid or has expired.');
        return ['message' => 'Password updated. You can sign in now.'];
    }
}
