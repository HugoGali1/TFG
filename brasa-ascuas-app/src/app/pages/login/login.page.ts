import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ToastController } from '@ionic/angular';

const AUTO_CREDS: Record<string, { email: string; password: string }> = {
  cocina: { email: 'cocina@brasaascuas.es', password: 'cocina1234' },
  admin:  { email: 'admin@brasaascuas.es',  password: 'admin1234'  },
};

@Component({ standalone: false, selector: 'app-login', templateUrl: './login.page.html', styleUrls: ['./login.page.scss'] })
export class LoginPage implements OnInit {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  loading = false;
  autoMode = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastController,
  ) {}

  ngOnInit() {
    const auto = this.route.snapshot.queryParamMap.get('auto');
    if (auto && AUTO_CREDS[auto]) {
      this.autoMode = true;
      const { email, password } = AUTO_CREDS[auto];
      this.form.patchValue({ email, password });
      this.login();
    }
  }

  async login() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading = false;
        const dest = this.auth.getRole() === 'admin' ? '/admin' : '/kitchen';
        this.router.navigateByUrl(dest);
      },
      error: async () => {
        this.loading = false;
        this.autoMode = false;
        const t = await this.toast.create({ message: 'Credenciales incorrectas', duration: 2000, color: 'danger' });
        t.present();
      }
    });
  }
}
