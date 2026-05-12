import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';

/**
 * Captura cualquier error HTTP y muestra un toast con el mensaje adecuado.
 * El error se vuelve a lanzar para que cada componente pueda hacer cleanup
 * (cerrar loaders, resetear flags) sin necesidad de mostrar su propio toast.
 *
 * Para saltarse el toast en una petición concreta, añade el header
 * `X-Skip-Error-Toast: true` antes de enviarla.
 */
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(private toast: ToastController) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const skip = req.headers.get('X-Skip-Error-Toast') === 'true';
    const cleaned = skip ? req.clone({ headers: req.headers.delete('X-Skip-Error-Toast') }) : req;

    return next.handle(cleaned).pipe(
      catchError((err: HttpErrorResponse) => {
        const isLoginAttempt = req.url.includes('/auth/login');
        if (!skip && !isLoginAttempt) this.showToast(err);
        return throwError(() => err);
      }),
    );
  }

  private async showToast(err: HttpErrorResponse) {
    const t = await this.toast.create({
      message: this.messageFor(err),
      duration: 2800,
      color: 'danger',
      position: 'bottom',
    });
    t.present();
  }

  private messageFor(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Sin conexión con el servidor';
    if (err.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
    if (err.status === 403) return 'No tienes permiso para esta acción';
    if (err.status === 404) return 'Recurso no encontrado';
    const backendMsg = (err.error as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(backendMsg)) return backendMsg[0];
    if (typeof backendMsg === 'string') return backendMsg;
    if (err.status >= 500) return 'Error del servidor. Inténtalo de nuevo.';
    return 'Algo ha fallado. Inténtalo de nuevo.';
  }
}
