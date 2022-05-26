import { take, switchMap, of, catchError, throwError } from 'rxjs';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'app/core/auth/auth.service';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import Swal from 'sweetalert2';

@Component({
  selector: 'settings-security',
  templateUrl: './security.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSecurityComponent implements OnInit {
  securityForm: FormGroup;
  disabled = true;
  user: User;

  constructor(
    private _formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private _authService: AuthService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _userService: UserService
  ) {}

  get code(): AbstractControl {
    return this.securityForm.get('code');
  }

  get newPassword(): AbstractControl {
    return this.securityForm.get('newPassword');
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  ngOnInit(): void {
    this.securityForm = this._formBuilder.group({
      code: ['', Validators.maxLength(6)],
      newPassword: ['', Validators.minLength(6)],
    });

    this._userService
      .get()
      .pipe(take(1))
      .subscribe((user) => {
        this.user = user;
        this._changeDetectorRef.markForCheck();
      });

    this.securityForm.disable();
    this._changeDetectorRef.markForCheck();
  }

  submit(): void {
    if (this.securityForm.invalid) {
      this.securityForm.markAllAsTouched();
      this._changeDetectorRef.markForCheck();
      return;
    }

    this.securityForm.disable();
    this._authService
      .checkPasswordCode(this.user.username, this.securityForm.value.code)
      .pipe(
        catchError((err) => {
          this.securityForm.enable();
          const ctrl = this.securityForm.get('code');
          ctrl.setErrors({ ...ctrl.errors, invalid: true });

          this._changeDetectorRef.markForCheck();
          return throwError(() => err);
        }),
        switchMap(() =>
          this._authService.resetPassword(
            this.user.username,
            this.securityForm.value.newPassword,
            this.securityForm.value.code
          )
        )
      )
      .subscribe(() => {
        Swal.fire({
          title: 'Password restored successfully!',
          icon: 'success',
        });

        this.securityForm.reset();
        this.securityForm.disable();
        this._changeDetectorRef.markForCheck();
      });
  }

  sendCode(): void {
    this._authService
      .sendPasswordCode(this.user.username)
      .subscribe(() =>
        this._snackBar.open('Verification code sent', null, { duration: 4000 })
      );
  }

  obfuscate(email: string): string {
    if (!email) {
      return '';
    }
    const parts = {
      first: email.split('@')[0],
      last: email.split('@')[email.split('@').length - 1],
    };

    const notObfuscated = parts.first.slice(0, 3);
    const obfuscation = '*'.repeat(parts.first.length);

    return `${notObfuscated}${obfuscation}@${parts.last}`;
  }

  cancel(): void {
    this.securityForm.reset();
    this.securityForm.disable();
    this._changeDetectorRef.markForCheck();
  }
}
