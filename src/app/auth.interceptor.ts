import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Retrieve the stored username from localStorage
    const username = localStorage.getItem('pma-username');

    // Attach the header only to requests going to your backend API
    if (username && req.url.includes('http://localhost:8080/api/')) {
      const clonedReq = req.clone({
        headers: req.headers.set('X-Username', username),
      });
      return next.handle(clonedReq);
    }

    return next.handle(req);
  }
}
